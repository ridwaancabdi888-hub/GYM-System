import { supabase } from '../config/supabase.js';
import { requireFields, ValidationError } from '../utils/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { logActivity } from '../services/activityLogger.js';
import { computePaymentStatus } from '../utils/paymentStatus.js';
import { attachPaymentStatus, listLatestSubscriptionsWithStatus } from '../services/subscriptionStatus.js';

export const listSubscriptions = asyncHandler(async (req, res) => {
  if (req.query.latestOnly === 'true') {
    const subscriptions = await listLatestSubscriptionsWithStatus(req.gymId);
    return res.json({ subscriptions });
  }

  let query = supabase
    .from('subscriptions')
    .select('*, members(full_name, member_code), membership_plans(name)')
    .eq('gym_id', req.gymId)
    .order('created_at', { ascending: false });

  if (req.query.memberId) query = query.eq('member_id', req.query.memberId);

  const { data, error } = await query;
  if (error) throw error;

  const withStatus = await attachPaymentStatus(data);
  res.json({ subscriptions: withStatus });
});

// Renews / assigns a plan to a member: creates a subscription row and
// updates the member's cached current plan/start/expiry fields. The plan's
// price is snapshotted onto the subscription as amount_due so a later
// price change never rewrites what a past cycle owed.
export const createSubscription = asyncHandler(async (req, res) => {
  requireFields(req.body, ['memberId', 'planId']);
  const { memberId, planId } = req.body;

  const { data: member } = await supabase.from('members').select('id, full_name').eq('id', memberId).eq('gym_id', req.gymId).maybeSingle();
  if (!member) throw new ValidationError('Member not found in this gym');

  const { data: plan } = await supabase.from('membership_plans').select('id, name, duration_days, price').eq('id', planId).eq('gym_id', req.gymId).maybeSingle();
  if (!plan) throw new ValidationError('Plan not found in this gym');

  const startDate = req.body.startDate || new Date().toISOString().slice(0, 10);
  const end = new Date(startDate);
  end.setDate(end.getDate() + plan.duration_days);
  const endDate = end.toISOString().slice(0, 10);

  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .insert({
      gym_id: req.gymId,
      member_id: memberId,
      plan_id: planId,
      start_date: startDate,
      end_date: endDate,
      amount_due: plan.price,
      status: 'active',
    })
    .select()
    .single();
  if (error) throw error;

  await supabase
    .from('members')
    .update({ membership_plan_id: planId, start_date: startDate, expiry_date: endDate, status: 'active' })
    .eq('id', memberId);

  await logActivity({ gymId: req.gymId, userId: req.auth.id, action: `Renewed ${plan.name} membership for ${member.full_name}`, relatedTable: 'subscriptions', relatedId: subscription.id });

  res.status(201).json({
    subscription: { ...subscription, amountPaid: 0, balance: Number(plan.price), paymentStatus: computePaymentStatus(plan.price, 0, endDate) },
  });
});
