import { Router } from 'express';
import { authenticate, requireGym, requireStaffPermission } from '../middleware/auth.js';
import { listAttendance, checkIn, lookupMembers } from '../controllers/attendance.controller.js';

const router = Router();

router.use(authenticate, requireGym, requireStaffPermission('attendance'));

router.get('/member-lookup', lookupMembers);
router.get('/', listAttendance);
router.post('/check-in', checkIn);

export default router;
