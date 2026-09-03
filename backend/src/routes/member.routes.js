import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { myProfile, myPayments, myAttendance, myAnnouncements, myQr } from '../controllers/memberSelf.controller.js';

const router = Router();

router.use(authenticate, requireRole('member'));

router.get('/me', myProfile);
router.get('/payments', myPayments);
router.get('/attendance', myAttendance);
router.get('/announcements', myAnnouncements);
router.get('/qr', myQr);

export default router;
