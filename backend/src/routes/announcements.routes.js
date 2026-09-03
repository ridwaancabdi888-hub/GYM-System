import { Router } from 'express';
import { authenticate, requireGym, requireStaffPermission } from '../middleware/auth.js';
import {
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '../controllers/announcements.controller.js';

const router = Router();

router.use(authenticate, requireGym, requireStaffPermission('announcements'));

router.get('/', listAnnouncements);
router.post('/', createAnnouncement);
router.patch('/:id', updateAnnouncement);
router.delete('/:id', deleteAnnouncement);

export default router;
