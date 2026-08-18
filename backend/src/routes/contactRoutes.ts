import { Router } from 'express';
import { getContacts } from '../controllers/contactController';
import { authenticateJwt } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', authenticateJwt, getContacts);

export default router;
