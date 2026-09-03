import { Router } from 'express';
import { authenticate, requireRole, requireGym } from '../middleware/auth.js';
import { listStaff, createStaff, updateStaff, resetStaffPassword } from '../controllers/staff.controller.js';

const router = Router();

router.use(authenticate, requireRole('gym_admin'), requireGym);

router.get('/', listStaff);
router.post('/', createStaff);
router.patch('/:id', updateStaff);
router.post('/:id/reset-password', resetStaffPassword);

export default router;
