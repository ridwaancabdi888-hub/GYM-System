import { Router } from 'express';
import { authenticate, requireGym, requireStaffPermission } from '../middleware/auth.js';
import { listSubscriptions, createSubscription } from '../controllers/subscriptions.controller.js';

const router = Router();

router.use(authenticate, requireGym, requireStaffPermission('members'));

router.get('/', listSubscriptions);
router.post('/', createSubscription);

export default router;
