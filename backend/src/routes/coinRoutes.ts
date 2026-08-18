import { Router } from 'express';
import { claimDailyReward, getCoinBalance, getRewards, redeemReward } from '../controllers/coinController';
import { authenticateJwt } from '../middlewares/authMiddleware';

const router = Router();

router.get('/balance', authenticateJwt, getCoinBalance);
router.post('/claim-daily', authenticateJwt, claimDailyReward);
router.get('/rewards', authenticateJwt, getRewards);
router.post('/redeem', authenticateJwt, redeemReward);

export default router;
