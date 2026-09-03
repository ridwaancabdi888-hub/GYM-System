import { supabase } from '../config/supabase.js';
import { hashPassword, generateTempPassword } from '../utils/password.js';
import { requireFields, isValidEmail, ValidationError } from '../utils/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { logActivity } from '../services/activityLogger.js';

export const listStaff = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, title, permissions, status, created_at')
    .eq('gym_id', req.gymId)
    .eq('role', 'staff')
    .order('created_at', { ascending: false });
  if (error) throw error;
  res.json({ staff: data });
});

export const createStaff = asyncHandler(async (req, res) => {
  requireFields(req.body, ['fullName', 'email']);
  const { fullName, email, title, permissions } = req.body;
  if (!isValidEmail(email)) throw new ValidationError('email is not valid');

  const { data: existing } = await supabase.from('users').select('id').eq('email', email.toLowerCase()).maybeSingle();
  if (existing) throw new ValidationError('A user with this email already exists');

  const tempPassword = generateTempPassword();
  const password_hash = await hashPassword(tempPassword);

  const { data, error } = await supabase
    .from('users')
    .insert({
      gym_id: req.gymId,
      role: 'staff',
      full_name: fullName,
      email: email.toLowerCase(),
      password_hash,
      title: title || null,
      permissions: permissions || {},
      status: 'active',
    })
    .select('id, full_name, email, title, permissions, status, created_at')
    .single();
  if (error) throw error;

  await logActivity({ gymId: req.gymId, userId: req.auth.id, action: `Created staff account for ${fullName}`, relatedTable: 'users', relatedId: data.id });

  res.status(201).json({ staff: data, tempPassword });
});

export const updateStaff = asyncHandler(async (req, res) => {
  const { fullName, title, permissions, status } = req.body;
  const update = {};
  if (fullName !== undefined) update.full_name = fullName;
  if (title !== undefined) update.title = title;
  if (permissions !== undefined) update.permissions = permissions;
  if (status !== undefined) update.status = status;

  const { data, error } = await supabase
    .from('users')
    .update(update)
    .eq('id', req.params.id)
    .eq('gym_id', req.gymId)
    .eq('role', 'staff')
    .select('id, full_name, email, title, permissions, status, created_at')
    .maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'Staff member not found' });

  await logActivity({ gymId: req.gymId, userId: req.auth.id, action: `Updated staff account for ${data.full_name}`, relatedTable: 'users', relatedId: data.id });

  res.json({ staff: data });
});

export const resetStaffPassword = asyncHandler(async (req, res) => {
  const { data: staff } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('id', req.params.id)
    .eq('gym_id', req.gymId)
    .eq('role', 'staff')
    .maybeSingle();
  if (!staff) return res.status(404).json({ error: 'Staff member not found' });

  const tempPassword = generateTempPassword();
  const password_hash = await hashPassword(tempPassword);
  await supabase.from('users').update({ password_hash }).eq('id', staff.id);

  await logActivity({ gymId: req.gymId, userId: req.auth.id, action: `Reset password for ${staff.full_name}`, relatedTable: 'users', relatedId: staff.id });

  res.json({ success: true, tempPassword });
});
