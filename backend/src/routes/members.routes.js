import { Router } from 'express';
import { authenticate, requireGym, requireStaffPermission } from '../middleware/auth.js';
import {
  listMembers,
  getMember,
  createMember,
  updateMember,
  setMemberStatus,
  getMemberQr,
  getMemberCredentials,
  setMemberPassword,
  resetMemberPassword,
} from '../controllers/members.controller.js';

const router = Router();

router.use(authenticate, requireGym, requireStaffPermission('members'));

router.get('/', listMembers);
router.get('/:id', getMember);
router.get('/:id/qr', getMemberQr);
router.get('/:id/credentials', getMemberCredentials);
router.post('/', createMember);
router.patch('/:id', updateMember);
router.patch('/:id/status', setMemberStatus);
router.post('/:id/set-password', setMemberPassword);
router.post('/:id/reset-password', resetMemberPassword);

export default router;
