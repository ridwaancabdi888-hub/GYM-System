import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  listGyms,
  getGym,
  createGym,
  updateGym,
  setGymStatus,
  resetGymAdminPassword,
} from '../controllers/superadmin.controller.js';

const router = Router();

router.use(authenticate, requireRole('super_admin'));

router.get('/gyms', listGyms);
router.get('/gyms/:id', getGym);
router.post('/gyms', createGym);
router.patch('/gyms/:id', updateGym);
router.patch('/gyms/:id/status', setGymStatus);
router.post('/gyms/:id/reset-admin-password', resetGymAdminPassword);

export default router;
