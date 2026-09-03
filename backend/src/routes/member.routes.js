import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  myProfile,
  myPayments,
  myAttendance,
  myAnnouncements,
  myQr,
  mySubscription,
  myProgressPhotos,
  uploadMyProgressPhoto,
  deleteMyProgressPhoto,
  getMyProgressPhotoDownloadUrl,
} from '../controllers/memberSelf.controller.js';

// Memory storage only — the buffer is forwarded straight to Supabase
// Storage, nothing is ever written to local disk. 4MB keeps every upload
// safely under Vercel's serverless request body ceiling; the frontend
// also resizes photos before sending them so this limit is rarely hit.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024 } });

const router = Router();

router.use(authenticate, requireRole('member'));

router.get('/me', myProfile);
router.get('/subscription', mySubscription);
router.get('/payments', myPayments);
router.get('/attendance', myAttendance);
router.get('/announcements', myAnnouncements);
router.get('/qr', myQr);

router.get('/progress-photos', myProgressPhotos);
router.post('/progress-photos', upload.single('photo'), uploadMyProgressPhoto);
router.get('/progress-photos/:id/download-url', getMyProgressPhotoDownloadUrl);
router.delete('/progress-photos/:id', deleteMyProgressPhoto);

export default router;
