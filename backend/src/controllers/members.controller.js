import { supabase } from '../config/supabase.js';
import { hashPassword, generateTempPassword } from '../utils/password.js';
import { requireFields, ValidationError } from '../utils/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { logActivity } from '../services/activityLogger.js';
import { generateMemberCode } from '../services/memberCode.js';
import { generateMemberQrDataUrl } from '../services/qrcode.js';
import { syncExpiredMembers } from '../services/memberMaintenance.js';
import { computeMemberStatus } from '../utils/memberStatus.js';

function usernameFromName(fullName, suffix) {
  const base = fullName.trim().toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).slice(0, 2).join('.');
  return `${base || 'member'}${suffix}`;
}

export const listMembers = asyncHandler(async (req, res) => {
  await syncExpiredMembers(req.gymId);

  const { search, status, page = 1, pageSize = 20 } = req.query;
  let query = supabase
    .from('members')
    .select('id, member_code, full_name, phone, gender, join_date, membership_plan_id, start_date, expiry_date, status, photo_url, username, created_at', { count: 'exact' })
    .eq('gym_id', req.gymId);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,member_code.ilike.%${search}%,phone.ilike.%${search}%`);
  }
  if (status) {
    query = query.eq('status', status);
  }

  const from = (Number(page) - 1) * Number(pageSize);
  const to = from + Number(pageSize) - 1;
  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  res.json({ members: data, total: count, page: Number(page), pageSize: Number(pageSize) });
});

export const getMember = asyncHandler(async (req, res) => {
  await syncExpiredMembers(req.gymId);

  const { data, error } = await supabase
    .from('members')
    .select('*, membership_plans(name, duration_days, price)')
    .eq('id', req.params.id)
    .eq('gym_id', req.gymId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'Member not found' });

  const { password_hash, ...safe } = data;
  res.json({ member: safe });
});

export const createMember = asyncHandler(async (req, res) => {
  requireFields(req.body, ['fullName']);
  const { fullName, phone, gender, membershipPlanId, photoUrl } = req.body;

  const { data: gym } = await supabase.from('gyms').select('name').eq('id', req.gymId).maybeSingle();
  const memberCode = await generateMemberCode(req.gymId, gym?.name || 'GYM');

  let startDate = null;
  let expiryDate = null;
  if (membershipPlanId) {
    const { data: plan } = await supabase.from('membership_plans').select('duration_days').eq('id', membershipPlanId).eq('gym_id', req.gymId).maybeSingle();
    if (!plan) throw new ValidationError('membershipPlanId is not valid for this gym');
    startDate = new Date().toISOString().slice(0, 10);
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + plan.duration_days);
    expiryDate = expiry.toISOString().slice(0, 10);
  }

  const username = usernameFromName(fullName, `${req.gymId.replace(/-/g, '').slice(0, 4)}${memberCode.slice(-4)}`);
  const tempPassword = generateTempPassword();
  const password_hash = await hashPassword(tempPassword);

  const { data: member, error } = await supabase
    .from('members')
    .insert({
      gym_id: req.gymId,
      member_code: memberCode,
      full_name: fullName,
      phone,
      gender,
      membership_plan_id: membershipPlanId || null,
      start_date: startDate,
      expiry_date: expiryDate,
      status: 'active',
      photo_url: photoUrl || null,
      username,
      password_hash,
    })
    .select()
    .single();
  if (error) throw error;

  if (membershipPlanId) {
    await supabase.from('subscriptions').insert({
      gym_id: req.gymId,
      member_id: member.id,
      plan_id: membershipPlanId,
      start_date: startDate,
      end_date: expiryDate,
      status: 'active',
    });
  }

  await logActivity({ gymId: req.gymId, userId: req.auth.id, action: `Added member ${fullName} (${memberCode})`, relatedTable: 'members', relatedId: member.id });

  const { password_hash: _, ...safeMember } = member;
  res.status(201).json({ member: safeMember, loginUsername: username, loginTempPassword: tempPassword });
});

export const updateMember = asyncHandler(async (req, res) => {
  const { fullName, phone, gender, photoUrl } = req.body;
  const update = {};
  if (fullName !== undefined) update.full_name = fullName;
  if (phone !== undefined) update.phone = phone;
  if (gender !== undefined) update.gender = gender;
  if (photoUrl !== undefined) update.photo_url = photoUrl;

  const { data, error } = await supabase
    .from('members')
    .update(update)
    .eq('id', req.params.id)
    .eq('gym_id', req.gymId)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'Member not found' });

  await logActivity({ gymId: req.gymId, userId: req.auth.id, action: `Edited membership details for ${data.full_name}`, relatedTable: 'members', relatedId: data.id });

  const { password_hash, ...safe } = data;
  res.json({ member: safe });
});

export const setMemberStatus = asyncHandler(async (req, res) => {
  requireFields(req.body, ['status']);
  if (!['active', 'inactive'].includes(req.body.status)) {
    throw new ValidationError('status must be "active" or "inactive"');
  }

  const { data: existing } = await supabase.from('members').select('expiry_date, full_name').eq('id', req.params.id).eq('gym_id', req.gymId).maybeSingle();
  if (!existing) return res.status(404).json({ error: 'Member not found' });

  const nextStatus = req.body.status === 'inactive' ? 'inactive' : computeMemberStatus(existing.expiry_date, 'active');

  const { data, error } = await supabase
    .from('members')
    .update({ status: nextStatus })
    .eq('id', req.params.id)
    .eq('gym_id', req.gymId)
    .select()
    .single();
  if (error) throw error;

  await logActivity({
    gymId: req.gymId,
    userId: req.auth.id,
    action: `${req.body.status === 'inactive' ? 'Deactivated' : 'Activated'} member ${existing.full_name}`,
    relatedTable: 'members',
    relatedId: req.params.id,
  });

  const { password_hash, ...safe } = data;
  res.json({ member: safe });
});

export const getMemberQr = asyncHandler(async (req, res) => {
  const { data } = await supabase.from('members').select('member_code').eq('id', req.params.id).eq('gym_id', req.gymId).maybeSingle();
  if (!data) return res.status(404).json({ error: 'Member not found' });
  const qrDataUrl = await generateMemberQrDataUrl(data.member_code);
  res.json({ qrDataUrl, memberCode: data.member_code });
});
