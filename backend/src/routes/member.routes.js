import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { myProfile, myPayments, myAttendance, myAnnouncements, myQr, mySubscription } from '../controllers/memberSelf.controller.js';

const router = Router();

router.use(authenticate, requireRole('member'));

router.get('/me', myProfile);
router.get('/subscription', mySubscription);
router.get('/payments', myPayments);
router.get('/attendance', myAttendance);
router.get('/announcements', myAnnouncements);
router.get('/qr', myQr);

export default router;
