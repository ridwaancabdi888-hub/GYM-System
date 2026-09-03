import { supabase } from '../config/supabase.js';
import { requireFields, ValidationError } from '../utils/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { logActivity } from '../services/activityLogger.js';

export const listPlans = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('membership_plans')
    .select('*')
    .eq('gym_id', req.gymId)
    .order('price', { ascending: true });
  if (error) throw error;
  res.json({ plans: data });
});

export const createPlan = asyncHandler(async (req, res) => {
  requireFields(req.body, ['name', 'durationDays', 'price']);
  const { name, durationDays, price, status } = req.body;
  if (Number(durationDays) <= 0) throw new ValidationError('durationDays must be positive');
  if (Number(price) < 0) throw new ValidationError('price must be zero or positive');

  const { data, error } = await supabase
    .from('membership_plans')
    .insert({ gym_id: req.gymId, name, duration_days: durationDays, price, status: status || 'active' })
    .select()
    .single();
  if (error) throw error;

  await logActivity({ gymId: req.gymId, userId: req.auth.id, action: `Created membership plan ${name}`, relatedTable: 'membership_plans', relatedId: data.id });
  res.status(201).json({ plan: data });
});

export const updatePlan = asyncHandler(async (req, res) => {
  const { name, durationDays, price, status } = req.body;
  const update = {};
  if (name !== undefined) update.name = name;
  if (durationDays !== undefined) update.duration_days = durationDays;
  if (price !== undefined) update.price = price;
  if (status !== undefined) update.status = status;

  const { data, error } = await supabase
    .from('membership_plans')
    .update(update)
    .eq('id', req.params.id)
    .eq('gym_id', req.gymId)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'Plan not found' });

  await logActivity({ gymId: req.gymId, userId: req.auth.id, action: `Updated membership plan ${data.name}`, relatedTable: 'membership_plans', relatedId: data.id });
  res.json({ plan: data });
});
