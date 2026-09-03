import { Router } from 'express';
import { authenticate, requireRole, requireGym } from '../middleware/auth.js';
import { listActivityLogs } from '../controllers/activityLogs.controller.js';

const router = Router();

// Only Gym Admins review staff activity logs (per spec, this is an admin-level view).
router.use(authenticate, requireRole('gym_admin'), requireGym);

router.get('/', listActivityLogs);

export default router;
