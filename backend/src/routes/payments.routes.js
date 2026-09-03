import { Router } from 'express';
import { authenticate, requireGym, requireStaffPermission } from '../middleware/auth.js';
import { listPayments, createPayment, getReceipt, lookupMembers } from '../controllers/payments.controller.js';

const router = Router();

router.use(authenticate, requireGym, requireStaffPermission('payments'));

router.get('/member-lookup', lookupMembers);
router.get('/', listPayments);
router.post('/', createPayment);
router.get('/:id/receipt', getReceipt);

export default router;
