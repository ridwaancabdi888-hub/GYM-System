import { verifyToken } from '../utils/jwt.js';

// Verifies the bearer JWT and attaches `req.auth`:
//   { subjectType: 'user' | 'member', id, role, gymId, permissions, status }
// role is one of: super_admin, gym_admin, staff, member
export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = verifyToken(token);
    req.auth = payload;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'You do not have access to this resource' });
    }
    return next();
  };
}

// Ensures the caller has a gym context and scopes it onto req.gymId.
// Super admins must pass ?gymId= or body.gymId explicitly for gym-scoped routes.
export function requireGym(req, res, next) {
  if (req.auth.role === 'super_admin') {
    const gymId = req.query.gymId || req.body.gymId || req.params.gymId;
    if (!gymId) {
      return res.status(400).json({ error: 'gymId is required for this request' });
    }
    req.gymId = gymId;
    return next();
  }

  if (!req.auth.gymId) {
    return res.status(403).json({ error: 'No gym associated with this account' });
  }

  req.gymId = req.auth.gymId;
  return next();
}

export function requireStaffPermission(module) {
  return (req, res, next) => {
    if (req.auth.role === 'gym_admin' || req.auth.role === 'super_admin') {
      return next();
    }
    if (req.auth.role === 'staff' && req.auth.permissions?.[module]) {
      return next();
    }
    return res.status(403).json({ error: `You do not have permission to access ${module}` });
  };
}
