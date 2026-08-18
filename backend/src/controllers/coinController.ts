import { Response } from 'express';
import { prisma } from '../db/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';

const getTashkentDateString = (): string => {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  return new Intl.DateTimeFormat('en-CA', options).format(new Date());
};

export const claimDailyReward = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Avtorizatsiyadan o\'tilmagan' });
    const userId = req.user.id;
    const dateKey = getTashkentDateString();

    const existingClaim = await prisma.dailyReward.findUnique({
      where: {
        userId_dateKey: {
          userId,
          dateKey,
        },
      },
    });

    if (existingClaim) {
      return res.status(400).json({
        success: false,
        alreadyClaimed: true,
        message: 'Bugungi +5 Coin bonusini allaqachon olgansiz. Keyingi bonus ertaga 00:00 da tayyor bo\'ladi!',
      });
    }

    // Atomic Daily Reward grant
    const result = await prisma.$transaction(async (tx) => {
      const reward = await tx.dailyReward.create({
        data: {
          userId,
          dateKey,
          coins: 5,
        },
      });

      const balance = await tx.coinBalance.upsert({
        where: { userId },
        update: {
          balance: { increment: 5 },
          totalEarned: { increment: 5 },
        },
        create: {
          userId,
          balance: 5,
          totalEarned: 5,
        },
      });

      await tx.coinTransaction.create({
        data: {
          userId,
          amount: 5,
          type: 'DAILY_REWARD',
          description: '🎁 Kunlik bonus coin',
          referenceId: reward.id,
        },
      });

      await tx.notification.create({
        data: {
          userId,
          title: '🎁 Kunlik +5 Coin bonusi!',
          message: `Bugungi +5 Coin bonusingiz hisobingizga qo'shildi!`,
        },
      });

      return balance;
    });

    return res.json({
      success: true,
      message: 'Tabriklaymiz! +5 Coin bonusi berildi!',
      balance: result.balance,
    });
  } catch (err: any) {
    console.error('claimDailyReward error:', err);
    if (err.code === 'P2002') {
      return res.status(400).json({
        success: false,
        alreadyClaimed: true,
        message: 'Bugungi bonus allaqachon olingan',
      });
    }
    return res.status(500).json({ success: false, message: 'Kunlik bonusni olishda xatolik' });
  }
};

export const getCoinBalance = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Avtorizatsiyadan o\'tilmagan' });
    const userId = req.user.id;

    let balanceRecord = await prisma.coinBalance.findUnique({
      where: { userId },
    });

    if (!balanceRecord) {
      balanceRecord = await prisma.coinBalance.create({
        data: { userId, balance: 0 },
      });
    }

    const transactions = await prisma.coinTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const dateKey = getTashkentDateString();
    const dailyRewardClaimedToday = !!(await prisma.dailyReward.findUnique({
      where: { userId_dateKey: { userId, dateKey } },
    }));

    return res.json({
      success: true,
      balance: balanceRecord.balance,
      totalEarned: balanceRecord.totalEarned,
      totalSpent: balanceRecord.totalSpent,
      dailyRewardClaimedToday,
      transactions,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Coin balansini olishda xatolik' });
  }
};

export const getRewards = async (req: AuthRequest, res: Response) => {
  try {
    let rewards = await prisma.reward.findMany({
      where: { active: true },
      orderBy: { coinPrice: 'asc' },
    });

    // Seed default rewards if none exist
    if (rewards.length === 0) {
      await prisma.reward.createMany({
        data: [
          {
            nameUz: '5,000 so\'m Telefon Balansi',
            nameRu: '5,000 сум Баланс Телефона',
            nameEn: '5,000 UZS Phone Top-up',
            descriptionUz: 'Har qanday O\'zbekiston mobil operatoriga 5000 so\'m to\'lov',
            descriptionRu: 'Пополнение мобильного счета на 5000 сум',
            descriptionEn: 'Phone balance top-up for 5,000 UZS',
            coinPrice: 50,
            stock: 100,
            image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=300&q=80',
          },
          {
            nameUz: 'Bepul Yetkazib Berish Voucheri',
            nameRu: 'Ваучер на бесплатную доставку',
            nameEn: 'Free Delivery Voucher',
            descriptionUz: 'Mahalla do\'konidan 1 ta bepul yetkazib berish xizmati',
            descriptionRu: 'Бесплатная доставка из магазина махалли',
            descriptionEn: 'Free grocery delivery service voucher',
            coinPrice: 30,
            stock: 200,
            image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=300&q=80',
          },
          {
            nameUz: '10,000 so\'m Do\'kon Chegirmasi',
            nameRu: 'Скидка 10,000 сум в магазине',
            nameEn: '10,000 UZS Store Coupon',
            descriptionUz: 'Mahalliy do\'kondan mahsulot xaridida 10,000 so\'m chegirma',
            descriptionRu: 'Скидка 10,000 сум на покупки в местном магазине',
            descriptionEn: '10,000 UZS discount at local store',
            coinPrice: 100,
            stock: 50,
            image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=300&q=80',
          },
        ],
      });

      rewards = await prisma.reward.findMany({
        where: { active: true },
        orderBy: { coinPrice: 'asc' },
      });
    }

    return res.json({ success: true, rewards });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Do\'kon mahsulotlarini olishda xatolik' });
  }
};

export const redeemReward = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Avtorizatsiyadan o\'tilmagan' });
    const { rewardId } = req.body;
    const userId = req.user.id;

    if (!rewardId) return res.status(400).json({ success: false, message: 'Mahsulot ID kiritilmagan' });

    const reward = await prisma.reward.findUnique({ where: { id: rewardId } });
    if (!reward || !reward.active) {
      return res.status(404).json({ success: false, message: 'Mahsulot topilmadi yoki faol emas' });
    }

    if (reward.stock <= 0) {
      return res.status(400).json({ success: false, message: 'Ushbu mahsulot zaxirada qolmagan' });
    }

    // Atomic Balance Check and Deduction
    const result = await prisma.$transaction(async (tx) => {
      const userBalance = await tx.coinBalance.findUnique({ where: { userId } });
      if (!userBalance || userBalance.balance < reward.coinPrice) {
        throw new Error('INSUFFICIENT_COINS');
      }

      const updatedBalance = await tx.coinBalance.update({
        where: { userId },
        data: {
          balance: { decrement: reward.coinPrice },
          totalSpent: { increment: reward.coinPrice },
        },
      });

      await tx.reward.update({
        where: { id: rewardId },
        data: { stock: { decrement: 1 } },
      });

      const redemption = await tx.rewardRedemption.create({
        data: {
          userId,
          rewardId,
          coinCost: reward.coinPrice,
          status: 'FULFILLED',
        },
      });

      await tx.coinTransaction.create({
        data: {
          userId,
          amount: -reward.coinPrice,
          type: 'STORE_PURCHASE',
          description: `🎁 ${reward.nameUz} sotib olindi`,
          referenceId: redemption.id,
        },
      });

      await tx.notification.create({
        data: {
          userId,
          title: '🛍 Mahsulot xarid qilindi!',
          message: `Siz "${reward.nameUz}" ni ${reward.coinPrice} coin evaziga xarid qildingiz!`,
        },
      });

      return { updatedBalance, redemption };
    });

    return res.json({
      success: true,
      message: `Tabriklaymiz! "${reward.nameUz}" muvaffaqiyatli xarid qilindi!`,
      newBalance: result.updatedBalance.balance,
      redemption: result.redemption,
    });
  } catch (err: any) {
    if (err.message === 'INSUFFICIENT_COINS') {
      return res.status(400).json({
        success: false,
        message: 'Coin yetarli emas. Ko\'proq buyurtmalar berib coin to\'plang!',
      });
    }
    console.error('redeemReward error:', err);
    return res.status(500).json({ success: false, message: 'Xaridlarda xatolik yuz berdi' });
  }
};
