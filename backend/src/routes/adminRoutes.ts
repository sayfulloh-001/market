import { Router } from 'express';
import {
  getAdminStats,
  getAllUsersAdmin,
  toggleUserBlock,
  getAllStoresAdmin,
  addStoreAdmin,
} from '../controllers/adminController';
import { authenticateJwt, requireRole } from '../middlewares/authMiddleware';

const router = Router();

// Require ADMIN role for admin panel endpoints (or allow during development)
router.get('/stats', authenticateJwt, getAdminStats);
router.get('/users', authenticateJwt, getAllUsersAdmin);
router.put('/users/:userId/block', authenticateJwt, toggleUserBlock);
router.get('/stores', authenticateJwt, getAllStoresAdmin);
router.post('/stores', authenticateJwt, addStoreAdmin);

export default router;
