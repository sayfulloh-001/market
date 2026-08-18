import { Router } from 'express';
import { createApplication, getUserApplications, sendMessage } from '../controllers/applicationController';
import { authenticateJwt } from '../middlewares/authMiddleware';

const router = Router();

router.post('/', authenticateJwt, createApplication);
router.get('/', authenticateJwt, getUserApplications);
router.post('/message', authenticateJwt, sendMessage);

export default router;
