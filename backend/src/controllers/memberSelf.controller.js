import { supabase } from '../config/supabase.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { generateMemberQrDataUrl } from '../services/qrcode.js';
import { syncExpiredMembers } from '../services/memberMaintenance.js';
import { attachPaymentStatus } from '../services/subscriptionStatus.js';

export const myProfile = asyncHandler(async (req, res) => {
  await syncExpiredMembers(req.auth.gymId);

  const { data, error } = await supabase
    .from('members')
    .select('*, membership_plans(name, duration_days, price)')
    .eq('id', req.auth.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'Member not found' });

  const { password_hash, ...safe } = data;
  res.json({ member: safe });
});

export const myPayments = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('member_id', req.auth.id)
    .order('payment_date', { ascending: false });
  if (error) throw error;
  res.json({ payments: data });
});

export const myAttendance = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('member_id', req.auth.id)
    .order('check_in_date', { ascending: false })
    .order('check_in_time', { ascending: false });
  if (error) throw error;
  res.json({ attendance: data });
});

export const myAnnouncements = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('gym_id', req.auth.gymId)
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  if (error) throw error;
  res.json({ announcements: data });
});

// The member's current membership cycle: amount due, amount paid, balance,
// and the automatically computed status (Pending / Unpaid / Partially
// Paid / Paid) — same computation the Gym Admin sees on the Payments page.
export const mySubscription = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, membership_plans(name)')
    .eq('member_id', req.auth.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return res.json({ subscription: null });

  const [withStatus] = await attachPaymentStatus([data]);
  res.json({ subscription: withStatus });
});

export const myQr = asyncHandler(async (req, res) => {
  const { data } = await supabase.from('members').select('member_code').eq('id', req.auth.id).maybeSingle();
  if (!data) return res.status(404).json({ error: 'Member not found' });
  const qrDataUrl = await generateMemberQrDataUrl(data.member_code);
  res.json({ qrDataUrl, memberCode: data.member_code });
});
