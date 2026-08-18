import { Router } from 'express';
import { createOrder, getUserOrders, updateOrderStatus } from '../controllers/orderController';
import { authenticateJwt } from '../middlewares/authMiddleware';

const router = Router();

router.post('/', authenticateJwt, createOrder);
router.get('/', authenticateJwt, getUserOrders);
router.put('/:id/status', authenticateJwt, updateOrderStatus);

export default router;
