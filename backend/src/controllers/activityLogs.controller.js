import { supabase } from '../config/supabase.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const listActivityLogs = asyncHandler(async (req, res) => {
  const { userId, date, page = 1, pageSize = 30 } = req.query;
  let query = supabase
    .from('activity_logs')
    .select('*, users(full_name, title)', { count: 'exact' })
    .eq('gym_id', req.gymId)
    .order('created_at', { ascending: false });

  if (userId) query = query.eq('user_id', userId);
  if (date) query = query.gte('created_at', `${date}T00:00:00`).lte('created_at', `${date}T23:59:59`);

  const from = (Number(page) - 1) * Number(pageSize);
  const to = from + Number(pageSize) - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  res.json({ activityLogs: data, total: count });
});
