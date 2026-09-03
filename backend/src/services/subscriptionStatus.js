import { supabase } from '../config/supabase.js';
import { computePaymentStatus } from '../utils/paymentStatus.js';

// Attaches amountPaid / balance / paymentStatus to each subscription, using
// one batched query for all their payments (no N+1).
export async function attachPaymentStatus(subscriptions) {
  if (!subscriptions.length) return subscriptions;

  const ids = subscriptions.map((s) => s.id);
  const { data: payments, error } = await supabase
    .from('payments')
    .select('subscription_id, amount')
    .in('subscription_id', ids);
  if (error) throw error;

  const paidBySubscription = {};
  for (const p of payments || []) {
    paidBySubscription[p.subscription_id] = (paidBySubscription[p.subscription_id] || 0) + Number(p.amount);
  }

  return subscriptions.map((s) => {
    const amountPaid = paidBySubscription[s.id] || 0;
    const balance = Math.max(0, Number(s.amount_due) - amountPaid);
    return {
      ...s,
      amountPaid,
      balance,
      paymentStatus: computePaymentStatus(s.amount_due, amountPaid, s.end_date),
    };
  });
}

// One row per member: their most recently created subscription, with
// payment status attached. Used by both the Members/Subscriptions views
// (permission: members) and the Payments page (permission: payments).
export async function listLatestSubscriptionsWithStatus(gymId) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, members(full_name, member_code), membership_plans(name)')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const withStatus = await attachPaymentStatus(data);

  const latestByMember = new Map();
  for (const sub of withStatus) {
    if (!latestByMember.has(sub.member_id)) latestByMember.set(sub.member_id, sub);
  }
  return [...latestByMember.values()];
}
