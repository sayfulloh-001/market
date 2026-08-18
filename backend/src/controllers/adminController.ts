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

export const getAdminStats = async (req: AuthRequest, res: Response) => {
  try {
    const todayStr = getTashkentDateString();

    const [
      totalUsers,
      totalOrders,
      totalApplications,
      activeStores,
      coinStats,
      redemptionsCount,
      allOrdersToday,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.order.count(),
      prisma.application.count(),
      prisma.store.count({ where: { isActive: true } }),
      prisma.coinBalance.aggregate({
        _sum: { balance: true, totalEarned: true },
      }),
      prisma.rewardRedemption.count(),
      prisma.order.findMany({
        select: { createdAt: true },
      }),
    ]);

    const ordersToday = allOrdersToday.filter((o) => {
      const dStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Tashkent',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(o.createdAt);
      return dStr === todayStr;
    }).length;

    return res.json({
      success: true,
      stats: {
        totalUsers,
        totalOrders,
        ordersToday,
        totalApplications,
        activeStores,
        totalCoinsEarned: coinStats._sum.totalEarned || 0,
        currentCoinBalanceTotal: coinStats._sum.balance || 0,
        redemptionsCount,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Admin statistikasini olishda xatolik' });
  }
};

export const getAllUsersAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: { coinBalance: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return res.json({ success: true, users });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Foydalanuvchilarni olishda xatolik' });
  }
};

export const toggleUserBlock = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isBlocked: !user.isBlocked },
    });

    return res.json({
      success: true,
      message: `Foydalanuvchi ${updated.isBlocked ? 'bloklandi' : 'blokdan chiqarildi'}`,
      user: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Server xatoligi' });
  }
};

export const getAllStoresAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const stores = await prisma.store.findMany({ orderBy: { createdAt: 'asc' } });
    return res.json({ success: true, stores });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Do\'konlarni olishda xatolik' });
  }
};

export const addStoreAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { name, telegramId } = req.body;
    if (!name || !telegramId) {
      return res.status(400).json({ success: false, message: 'Nomi va Telegram ID kiritilishi kerak' });
    }

    const store = await prisma.store.create({
      data: { name, telegramId, isActive: true },
    });

    return res.json({ success: true, message: 'Do\'kon qo\'shildi', store });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Do\'kon qo\'shishda xatolik' });
  }
};
