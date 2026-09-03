import { supabase } from '../config/supabase.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { requireFields, ValidationError } from '../utils/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const login = asyncHandler(async (req, res) => {
  requireFields(req.body, ['identifier', 'password']);
  const identifier = String(req.body.identifier).trim().toLowerCase();
  const { password } = req.body;

  // Try staff/admin/super-admin first (by email)
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', identifier)
    .maybeSingle();

  if (user) {
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'This account has been disabled. Contact your gym admin.' });
    }
    const ok = await comparePassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    const token = signToken({
      subjectType: 'user',
      id: user.id,
      role: user.role,
      gymId: user.gym_id,
      permissions: user.permissions || {},
    });

    return res.json({
      token,
      profile: {
        id: user.id,
        role: user.role,
        fullName: user.full_name,
        email: user.email,
        gymId: user.gym_id,
        permissions: user.permissions || {},
        title: user.title,
      },
    });
  }

  // Fall back to member login (by username)
  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('username', identifier)
    .maybeSingle();

  if (member) {
    const ok = await comparePassword(password, member.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid username or password' });

    const token = signToken({
      subjectType: 'member',
      id: member.id,
      role: 'member',
      gymId: member.gym_id,
    });

    return res.json({
      token,
      profile: {
        id: member.id,
        role: 'member',
        fullName: member.full_name,
        username: member.username,
        gymId: member.gym_id,
        memberCode: member.member_code,
      },
    });
  }

  return res.status(401).json({ error: 'Invalid email/username or password' });
});

export const me = asyncHandler(async (req, res) => {
  const { subjectType, id } = req.auth;
  const table = subjectType === 'member' ? 'members' : 'users';
  const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
  if (error || !data) return res.status(404).json({ error: 'Account not found' });

  const { password_hash, ...safe } = data;
  return res.json({ profile: safe, role: req.auth.role });
});

export const changePassword = asyncHandler(async (req, res) => {
  requireFields(req.body, ['currentPassword', 'newPassword']);
  if (String(req.body.newPassword).length < 6) {
    throw new ValidationError('New password must be at least 6 characters');
  }

  const { subjectType, id } = req.auth;
  const table = subjectType === 'member' ? 'members' : 'users';
  const { data: record } = await supabase.from(table).select('password_hash').eq('id', id).maybeSingle();
  if (!record) return res.status(404).json({ error: 'Account not found' });

  const ok = await comparePassword(req.body.currentPassword, record.password_hash);
  if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });

  const password_hash = await hashPassword(req.body.newPassword);
  await supabase.from(table).update({ password_hash }).eq('id', id);
  return res.json({ success: true });
});
