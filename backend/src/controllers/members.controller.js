import { supabase } from '../config/supabase.js';
import { hashPassword, generateTempPassword } from '../utils/password.js';
import { requireFields, ValidationError } from '../utils/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { logActivity } from '../services/activityLogger.js';
import { generateMemberCode } from '../services/memberCode.js';
import { generateMemberQrDataUrl } from '../services/qrcode.js';
import { syncExpiredMembers } from '../services/memberMaintenance.js';
import { computeMemberStatus } from '../utils/memberStatus.js';
import { getSignedViewUrls } from '../services/progressPhotoStorage.js';

export const listMembers = asyncHandler(async (req, res) => {
  await syncExpiredMembers(req.gymId);

  const { search, status, page = 1, pageSize = 20 } = req.query;
  let query = supabase
    .from('members')
    .select('id, member_code, full_name, phone, gender, join_date, membership_plan_id, start_date, expiry_date, status, photo_url, created_at', { count: 'exact' })
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

  const memberCode = await generateMemberCode(req.gymId);

  let startDate = null;
  let expiryDate = null;
  let plan = null;
  if (membershipPlanId) {
    const { data: planRow } = await supabase.from('membership_plans').select('duration_days, price').eq('id', membershipPlanId).eq('gym_id', req.gymId).maybeSingle();
    if (!planRow) throw new ValidationError('membershipPlanId is not valid for this gym');
    plan = planRow;
    startDate = new Date().toISOString().slice(0, 10);
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + plan.duration_days);
    expiryDate = expiry.toISOString().slice(0, 10);
  }

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
      amount_due: plan.price,
      status: 'active',
    });
  }

  await logActivity({ gymId: req.gymId, userId: req.auth.id, action: `Added member ${fullName} (${memberCode})`, relatedTable: 'members', relatedId: member.id });

  const { password_hash: _, ...safeMember } = member;
  res.status(201).json({ member: safeMember, loginUsername: memberCode, loginTempPassword: tempPassword });
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

// Login details a Gym Admin can always see: the Member ID (login username)
// and account status. The password itself is never stored or returned
// here — passwords are one-way hashed, so "the current password" isn't
// something any system can retrieve. Use setMemberPassword to hand the
// member a known-working password instead.
export const getMemberCredentials = asyncHandler(async (req, res) => {
  const { data } = await supabase
    .from('members')
    .select('member_code, status')
    .eq('id', req.params.id)
    .eq('gym_id', req.gymId)
    .maybeSingle();
  if (!data) return res.status(404).json({ error: 'Member not found' });
  res.json({ username: data.member_code, status: data.status });
});

// Gym Admin manually sets a specific password for the member.
export const setMemberPassword = asyncHandler(async (req, res) => {
  requireFields(req.body, ['newPassword']);
  if (String(req.body.newPassword).length < 6) {
    throw new ValidationError('Password must be at least 6 characters');
  }

  const { data: member } = await supabase
    .from('members')
    .select('member_code, full_name')
    .eq('id', req.params.id)
    .eq('gym_id', req.gymId)
    .maybeSingle();
  if (!member) return res.status(404).json({ error: 'Member not found' });

  const password_hash = await hashPassword(req.body.newPassword);
  await supabase.from('members').update({ password_hash }).eq('id', req.params.id);

  await logActivity({
    gymId: req.gymId,
    userId: req.auth.id,
    action: `Changed password for member ${member.full_name} (${member.member_code})`,
    relatedTable: 'members',
    relatedId: req.params.id,
  });

  res.json({ username: member.member_code, password: req.body.newPassword });
});

// Read-only, gym-scoped view of a member's progress photos for the Gym
// Admin/staff — never a photo belonging to another gym's member.
export const listMemberProgressPhotos = asyncHandler(async (req, res) => {
  const { data: member } = await supabase.from('members').select('id').eq('id', req.params.id).eq('gym_id', req.gymId).maybeSingle();
  if (!member) return res.status(404).json({ error: 'Member not found' });

  const { data, error } = await supabase
    .from('progress_photos')
    .select('*')
    .eq('member_id', req.params.id)
    .eq('gym_id', req.gymId)
    .order('taken_date', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;

  const urlByPath = await getSignedViewUrls(data.map((p) => p.storage_path));
  const photos = data.map((p) => ({ ...p, url: urlByPath[p.storage_path] || null }));
  res.json({ photos });
});
