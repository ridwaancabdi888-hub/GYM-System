import { Router } from 'express';
import { authenticate, requireRole, requireGym, requireStaffPermission } from '../middleware/auth.js';
import { summary, paymentsReport, staffActivityReport } from '../controllers/reports.controller.js';

const router = Router();

router.use(authenticate, requireGym, requireStaffPermission('reports'));

router.get('/summary', summary);
router.get('/payments', paymentsReport);
router.get('/staff-activity', requireRole('gym_admin', 'super_admin'), staffActivityReport);

export default router;
