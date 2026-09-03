import { supabase } from '../config/supabase.js';
import { requireFields, ValidationError } from '../utils/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { logActivity } from '../services/activityLogger.js';
import { computeMemberStatus } from '../utils/memberStatus.js';

// Lightweight member lookup for staff who only have the "attendance"
// permission (e.g. a Receptionist), so they can search a member to check in
// without needing the broader "members" permission.
export const lookupMembers = asyncHandler(async (req, res) => {
  const { search = '' } = req.query;
  let query = supabase
    .from('members')
    .select('id, member_code, full_name, phone, status, expiry_date')
    .eq('gym_id', req.gymId)
    .limit(10);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,member_code.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  res.json({ members: data });
});

export const listAttendance = asyncHandler(async (req, res) => {
  const { date, memberId, page = 1, pageSize = 30 } = req.query;
  let query = supabase
    .from('attendance')
    .select('*, members(full_name, member_code), users(full_name)', { count: 'exact' })
    .eq('gym_id', req.gymId)
    .order('check_in_date', { ascending: false })
    .order('check_in_time', { ascending: false });

  if (date) query = query.eq('check_in_date', date);
  if (memberId) query = query.eq('member_id', memberId);

  const from = (Number(page) - 1) * Number(pageSize);
  const to = from + Number(pageSize) - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  res.json({ attendance: data, total: count });
});

// Accepts either { memberId } or { memberCode } (from search or QR scan).
export const checkIn = asyncHandler(async (req, res) => {
  const { memberId, memberCode } = req.body;
  if (!memberId && !memberCode) throw new ValidationError('memberId or memberCode is required');

  let memberQuery = supabase.from('members').select('id, full_name, member_code, status, expiry_date').eq('gym_id', req.gymId);
  memberQuery = memberId ? memberQuery.eq('id', memberId) : memberQuery.eq('member_code', memberCode);
  const { data: member } = await memberQuery.maybeSingle();

  if (!member) return res.status(404).json({ error: 'Member not found in this gym' });

  const effectiveStatus = computeMemberStatus(member.expiry_date, member.status);
  const expired = effectiveStatus === 'expired';
  const inactive = effectiveStatus === 'inactive';

  if (inactive) {
    return res.status(409).json({ error: `${member.full_name}'s account is deactivated`, member });
  }

  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const { data: existingRows } = await supabase
    .from('attendance')
    .select('id, check_in_time')
    .eq('gym_id', req.gymId)
    .eq('member_id', member.id)
    .eq('check_in_date', today)
    .order('check_in_time', { ascending: true })
    .limit(1);

  if (existingRows && existingRows.length > 0) {
    return res.status(409).json({
      error: `${member.full_name} already checked in today at ${existingRows[0].check_in_time.slice(0, 5)}`,
      alreadyCheckedIn: true,
      member,
    });
  }

  const { data: record, error } = await supabase
    .from('attendance')
    .insert({
      gym_id: req.gymId,
      member_id: member.id,
      check_in_date: now.toISOString().slice(0, 10),
      check_in_time: now.toTimeString().slice(0, 8),
      recorded_by: req.auth.id,
    })
    .select()
    .single();
  if (error) throw error;

  await logActivity({ gymId: req.gymId, userId: req.auth.id, action: `Checked in ${member.full_name} (${member.member_code})`, relatedTable: 'attendance', relatedId: record.id });

  res.status(201).json({ attendance: record, member, expiredWarning: expired });
});
