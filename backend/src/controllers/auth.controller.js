import { supabase } from '../config/supabase.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { requireFields, ValidationError } from '../utils/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

async function getGymName(gymId) {
  if (!gymId) return null;
  const { data } = await supabase.from('gyms').select('name').eq('id', gymId).maybeSingle();
  return data?.name || null;
}

// Builds the camelCase profile shape sent to the frontend for both
// /auth/login and /auth/me, so a page refresh (which re-fetches via /me)
// never produces a differently-shaped profile than a fresh login did.
function buildUserProfile(user, gymName) {
  return {
    id: user.id,
    role: user.role,
    fullName: user.full_name,
    email: user.email,
    gymId: user.gym_id,
    gymName,
    permissions: user.permissions || {},
    title: user.title,
  };
}

function buildMemberProfile(member, gymName) {
  return {
    id: member.id,
    role: 'member',
    fullName: member.full_name,
    gymId: member.gym_id,
    gymName,
    memberCode: member.member_code,
  };
}

export const login = asyncHandler(async (req, res) => {
  requireFields(req.body, ['identifier', 'password']);
  const rawIdentifier = String(req.body.identifier).trim();
  const { password } = req.body;

  // Try staff/admin/super-admin first (by email)
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', rawIdentifier.toLowerCase())
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

    const gymName = await getGymName(user.gym_id);
    return res.json({ token, profile: buildUserProfile(user, gymName) });
  }

  // Fall back to member login, by Member ID (member_code, e.g. "M001").
  // Member IDs are only unique WITHIN a gym — each gym has its own M001,
  // M002... sequence — so the same code can legitimately match members in
  // several different gyms. Identity is resolved by checking the password
  // against every candidate, not by a single unique lookup.
  const { data: candidates } = await supabase
    .from('members')
    .select('*')
    .eq('member_code', rawIdentifier.toUpperCase());

  for (const member of candidates || []) {
    const ok = await comparePassword(password, member.password_hash);
    if (!ok) continue;

    if (member.status === 'inactive') {
      return res.status(403).json({ error: 'This account has been disabled. Contact your gym.' });
    }

    const token = signToken({
      subjectType: 'member',
      id: member.id,
      role: 'member',
      gymId: member.gym_id,
    });

    const gymName = await getGymName(member.gym_id);
    return res.json({ token, profile: buildMemberProfile(member, gymName) });
  }

  return res.status(401).json({ error: 'Invalid email/Member ID or password' });
});

export const me = asyncHandler(async (req, res) => {
  const { subjectType, id, role } = req.auth;
  const table = subjectType === 'member' ? 'members' : 'users';
  const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
  if (error || !data) return res.status(404).json({ error: 'Account not found' });

  const gymName = await getGymName(data.gym_id);
  const profile = subjectType === 'member' ? buildMemberProfile(data, gymName) : buildUserProfile(data, gymName);
  return res.json({ profile, role });
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
