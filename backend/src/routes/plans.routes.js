import { Router } from 'express';
import { authenticate, requireGym, requireStaffPermission } from '../middleware/auth.js';
import { listPlans, createPlan, updatePlan } from '../controllers/plans.controller.js';

const router = Router();

router.use(authenticate, requireGym, requireStaffPermission('plans'));

router.get('/', listPlans);
router.post('/', createPlan);
router.patch('/:id', updatePlan);

export default router;
