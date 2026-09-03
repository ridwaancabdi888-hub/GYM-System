import { supabase } from '../config/supabase.js';
import { requireFields, ValidationError } from '../utils/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { logActivity } from '../services/activityLogger.js';

export const listSubscriptions = asyncHandler(async (req, res) => {
  let query = supabase
    .from('subscriptions')
    .select('*, members(full_name, member_code), membership_plans(name)')
    .eq('gym_id', req.gymId)
    .order('created_at', { ascending: false });

  if (req.query.memberId) query = query.eq('member_id', req.query.memberId);

  const { data, error } = await query;
  if (error) throw error;
  res.json({ subscriptions: data });
});

// Renews / assigns a plan to a member: creates a subscription row and
// updates the member's cached current plan/start/expiry fields.
export const createSubscription = asyncHandler(async (req, res) => {
  requireFields(req.body, ['memberId', 'planId']);
  const { memberId, planId } = req.body;

  const { data: member } = await supabase.from('members').select('id, full_name').eq('id', memberId).eq('gym_id', req.gymId).maybeSingle();
  if (!member) throw new ValidationError('Member not found in this gym');

  const { data: plan } = await supabase.from('membership_plans').select('id, name, duration_days').eq('id', planId).eq('gym_id', req.gymId).maybeSingle();
  if (!plan) throw new ValidationError('Plan not found in this gym');

  const startDate = req.body.startDate || new Date().toISOString().slice(0, 10);
  const end = new Date(startDate);
  end.setDate(end.getDate() + plan.duration_days);
  const endDate = end.toISOString().slice(0, 10);

  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .insert({ gym_id: req.gymId, member_id: memberId, plan_id: planId, start_date: startDate, end_date: endDate, status: 'active' })
    .select()
    .single();
  if (error) throw error;

  await supabase
    .from('members')
    .update({ membership_plan_id: planId, start_date: startDate, expiry_date: endDate, status: 'active' })
    .eq('id', memberId);

  await logActivity({ gymId: req.gymId, userId: req.auth.id, action: `Renewed ${plan.name} membership for ${member.full_name}`, relatedTable: 'subscriptions', relatedId: subscription.id });

  res.status(201).json({ subscription });
});
