import { supabase } from '../config/supabase.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { syncExpiredMembers } from '../services/memberMaintenance.js';

export const summary = asyncHandler(async (req, res) => {
  const gymId = req.gymId;
  await syncExpiredMembers(gymId);
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;

  const [
    totalMembers,
    activeMembers,
    expiredMembers,
    todayAttendance,
    monthlyPayments,
    todaysPayments,
  ] = await Promise.all([
    supabase.from('members').select('id', { count: 'exact', head: true }).eq('gym_id', gymId),
    supabase.from('members').select('id', { count: 'exact', head: true }).eq('gym_id', gymId).eq('status', 'active'),
    supabase.from('members').select('id', { count: 'exact', head: true }).eq('gym_id', gymId).eq('status', 'expired'),
    supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('gym_id', gymId).eq('check_in_date', today),
    supabase.from('payments').select('amount').eq('gym_id', gymId).gte('payment_date', monthStart),
    supabase.from('payments').select('amount').eq('gym_id', gymId).eq('payment_date', today),
  ]);

  const monthlyIncome = (monthlyPayments.data || []).reduce((sum, p) => sum + Number(p.amount), 0);
  const todaysIncome = (todaysPayments.data || []).reduce((sum, p) => sum + Number(p.amount), 0);

  res.json({
    totalMembers: totalMembers.count || 0,
    activeMembers: activeMembers.count || 0,
    expiredMembers: expiredMembers.count || 0,
    todayAttendance: todayAttendance.count || 0,
    monthlyIncome,
    todaysIncome,
  });
});

export const paymentsReport = asyncHandler(async (req, res) => {
  const { range = 'daily' } = req.query;
  const gymId = req.gymId;

  const days = range === 'monthly' ? 180 : 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('payments')
    .select('amount, payment_date')
    .eq('gym_id', gymId)
    .gte('payment_date', since.toISOString().slice(0, 10))
    .order('payment_date', { ascending: true });
  if (error) throw error;

  const bucketKey = (dateStr) => (range === 'monthly' ? dateStr.slice(0, 7) : dateStr);
  const buckets = {};
  (data || []).forEach((p) => {
    const key = bucketKey(p.payment_date);
    buckets[key] = (buckets[key] || 0) + Number(p.amount);
  });

  const series = Object.entries(buckets).map(([period, total]) => ({ period, total }));
  res.json({ range, series });
});

export const staffActivityReport = asyncHandler(async (req, res) => {
  const gymId = req.gymId;
  const { data, error } = await supabase
    .from('activity_logs')
    .select('user_id, users(full_name)')
    .eq('gym_id', gymId);
  if (error) throw error;

  const counts = {};
  (data || []).forEach((row) => {
    const name = row.users?.full_name || 'Unknown';
    counts[name] = (counts[name] || 0) + 1;
  });

  const staffActivity = Object.entries(counts)
    .map(([staffName, actionCount]) => ({ staffName, actionCount }))
    .sort((a, b) => b.actionCount - a.actionCount);

  res.json({ staffActivity });
});
