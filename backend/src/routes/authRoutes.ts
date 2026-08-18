import { Router } from 'express';
import {
  requestTelegramAuth,
  checkAuthStatus,
  verifyAuthCode,
  uploadFacePhoto,
  getProfile,
  updateProfile,
} from '../controllers/authController';
import { authenticateJwt } from '../middlewares/authMiddleware';
import { uploadFacePhoto as multerUpload } from '../middlewares/uploadMiddleware';

const router = Router();

router.post('/request-telegram', requestTelegramAuth);
router.post('/verify-code', verifyAuthCode);
router.get('/check-status', checkAuthStatus);
router.get('/profile', authenticateJwt, getProfile);
router.put('/profile', authenticateJwt, updateProfile);
router.post('/upload-face', authenticateJwt, multerUpload.single('photo'), uploadFacePhoto);

export default router;
