import { supabase } from '../config/supabase.js';
import { hashPassword, generateTempPassword } from '../utils/password.js';
import { requireFields, isValidEmail, ValidationError } from '../utils/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const listGyms = asyncHandler(async (req, res) => {
  const { data: gyms, error } = await supabase
    .from('gyms')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const gymIds = gyms.map((g) => g.id);
  const { data: admins } = await supabase
    .from('users')
    .select('id, gym_id, full_name, email, status')
    .eq('role', 'gym_admin')
    .in('gym_id', gymIds.length ? gymIds : ['00000000-0000-0000-0000-000000000000']);

  const { data: memberCounts } = await supabase
    .from('members')
    .select('gym_id')
    .in('gym_id', gymIds.length ? gymIds : ['00000000-0000-0000-0000-000000000000']);

  const countByGym = {};
  (memberCounts || []).forEach((m) => {
    countByGym[m.gym_id] = (countByGym[m.gym_id] || 0) + 1;
  });

  const result = gyms.map((g) => ({
    ...g,
    admin: (admins || []).find((a) => a.gym_id === g.id) || null,
    memberCount: countByGym[g.id] || 0,
  }));

  res.json({ gyms: result });
});

export const getGym = asyncHandler(async (req, res) => {
  const { data: gym, error } = await supabase.from('gyms').select('*').eq('id', req.params.id).maybeSingle();
  if (error) throw error;
  if (!gym) return res.status(404).json({ error: 'Gym not found' });

  const { data: admin } = await supabase
    .from('users')
    .select('id, full_name, email, status, created_at')
    .eq('gym_id', gym.id)
    .eq('role', 'gym_admin')
    .maybeSingle();

  res.json({ gym, admin: admin || null });
});

export const createGym = asyncHandler(async (req, res) => {
  requireFields(req.body, ['gymName', 'adminFullName', 'adminEmail']);
  const { gymName, address, phone, email, adminFullName, adminEmail } = req.body;

  if (!isValidEmail(adminEmail)) throw new ValidationError('adminEmail is not a valid email address');

  const { data: existing } = await supabase.from('users').select('id').eq('email', adminEmail.toLowerCase()).maybeSingle();
  if (existing) throw new ValidationError('A user with this admin email already exists');

  const { data: gym, error: gymErr } = await supabase
    .from('gyms')
    .insert({ name: gymName, address, phone, email, status: 'active', subscription_status: 'trial' })
    .select()
    .single();
  if (gymErr) throw gymErr;

  const tempPassword = generateTempPassword();
  const password_hash = await hashPassword(tempPassword);

  const { data: admin, error: adminErr } = await supabase
    .from('users')
    .insert({
      gym_id: gym.id,
      role: 'gym_admin',
      full_name: adminFullName,
      email: adminEmail.toLowerCase(),
      password_hash,
      status: 'active',
    })
    .select('id, full_name, email, status, created_at')
    .single();
  if (adminErr) throw adminErr;

  res.status(201).json({ gym, admin, adminTempPassword: tempPassword });
});

export const updateGym = asyncHandler(async (req, res) => {
  const { gymName, address, phone, email } = req.body;
  const update = {};
  if (gymName !== undefined) update.name = gymName;
  if (address !== undefined) update.address = address;
  if (phone !== undefined) update.phone = phone;
  if (email !== undefined) update.email = email;

  const { data, error } = await supabase.from('gyms').update(update).eq('id', req.params.id).select().maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'Gym not found' });
  res.json({ gym: data });
});

export const setGymStatus = asyncHandler(async (req, res) => {
  requireFields(req.body, ['status']);
  if (!['active', 'suspended'].includes(req.body.status)) {
    throw new ValidationError('status must be "active" or "suspended"');
  }
  const { data, error } = await supabase
    .from('gyms')
    .update({ status: req.body.status })
    .eq('id', req.params.id)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'Gym not found' });
  res.json({ gym: data });
});

export const resetGymAdminPassword = asyncHandler(async (req, res) => {
  const { data: admin } = await supabase
    .from('users')
    .select('id')
    .eq('gym_id', req.params.id)
    .eq('role', 'gym_admin')
    .maybeSingle();
  if (!admin) return res.status(404).json({ error: 'No Gym Admin found for this gym' });

  const tempPassword = generateTempPassword();
  const password_hash = await hashPassword(tempPassword);
  await supabase.from('users').update({ password_hash, status: 'active' }).eq('id', admin.id);

  res.json({ success: true, adminTempPassword: tempPassword });
});
