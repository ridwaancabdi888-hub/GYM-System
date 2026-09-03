import { supabase } from '../config/supabase.js';
import { requireFields, ValidationError } from '../utils/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { logActivity } from '../services/activityLogger.js';
import { listLatestSubscriptionsWithStatus } from '../services/subscriptionStatus.js';

const METHODS = ['cash', 'zaad', 'edahab', 'other'];

// One row per member: their current membership cycle's amount due, amount
// paid, balance, and automatically computed status (Pending / Unpaid /
// Partially Paid / Paid). Lives under /payments (not /subscriptions) so
// staff who only have the "payments" permission — e.g. a Cashier — can see
// it without needing the broader "members" permission.
export const listMembershipStatus = asyncHandler(async (req, res) => {
  const subscriptions = await listLatestSubscriptionsWithStatus(req.gymId);
  res.json({ subscriptions });
});

// Lightweight member lookup so staff who only have the "payments" permission
// (e.g. a Cashier) can find a member to charge without needing the broader
// "members" permission.
export const lookupMembers = asyncHandler(async (req, res) => {
  const { search = '' } = req.query;
  let query = supabase
    .from('members')
    .select('id, member_code, full_name, phone, status')
    .eq('gym_id', req.gymId)
    .limit(10);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,member_code.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  res.json({ members: data });
});

export const listPayments = asyncHandler(async (req, res) => {
  const { memberId, from, to, page = 1, pageSize = 20 } = req.query;
  let query = supabase
    .from('payments')
    .select('*, members(full_name, member_code), users(full_name)', { count: 'exact' })
    .eq('gym_id', req.gymId)
    .order('payment_date', { ascending: false });

  if (memberId) query = query.eq('member_id', memberId);
  if (from) query = query.gte('payment_date', from);
  if (to) query = query.lte('payment_date', to);

  const fromIdx = (Number(page) - 1) * Number(pageSize);
  const toIdx = fromIdx + Number(pageSize) - 1;
  query = query.range(fromIdx, toIdx);

  const { data, error, count } = await query;
  if (error) throw error;
  res.json({ payments: data, total: count, page: Number(page), pageSize: Number(pageSize) });
});

export const createPayment = asyncHandler(async (req, res) => {
  requireFields(req.body, ['memberId', 'amount', 'method']);
  const { memberId, amount, method, subscriptionId, paymentDate, notes } = req.body;

  if (!METHODS.includes(method)) throw new ValidationError(`method must be one of: ${METHODS.join(', ')}`);
  if (Number(amount) < 0) throw new ValidationError('amount must be zero or positive');

  const { data: member } = await supabase.from('members').select('id, full_name').eq('id', memberId).eq('gym_id', req.gymId).maybeSingle();
  if (!member) throw new ValidationError('Member not found in this gym');

  // A payment counts toward a membership cycle's balance, so unless the
  // caller names one explicitly, attribute it to the member's current
  // (most recently created) subscription.
  let resolvedSubscriptionId = subscriptionId || null;
  if (!resolvedSubscriptionId) {
    const { data: latestSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('member_id', memberId)
      .eq('gym_id', req.gymId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    resolvedSubscriptionId = latestSub?.id || null;
  }

  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      gym_id: req.gymId,
      member_id: memberId,
      subscription_id: resolvedSubscriptionId,
      amount,
      method,
      payment_date: paymentDate || new Date().toISOString().slice(0, 10),
      received_by: req.auth.id,
      notes: notes || null,
    })
    .select()
    .single();
  if (error) throw error;

  await logActivity({ gymId: req.gymId, userId: req.auth.id, action: `Received $${Number(amount).toFixed(2)} payment from ${member.full_name}`, relatedTable: 'payments', relatedId: payment.id });

  res.status(201).json({ payment });
});

export const getReceipt = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('payments')
    .select('*, members(full_name, member_code, phone), users(full_name)')
    .eq('id', req.params.id)
    .eq('gym_id', req.gymId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'Payment not found' });

  const { data: gym } = await supabase.from('gyms').select('name, address, phone, email').eq('id', req.gymId).maybeSingle();

  res.json({
    receipt: {
      gym,
      payment: {
        id: data.id,
        amount: data.amount,
        method: data.method,
        paymentDate: data.payment_date,
        notes: data.notes,
      },
      member: data.members,
      receivedBy: data.users?.full_name || 'N/A',
    },
  });
});
