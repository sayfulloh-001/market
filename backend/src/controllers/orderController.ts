import { Response } from 'express';
import { prisma } from '../db/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';
import { sendOrderToStore } from '../services/telegramBot';
import { config } from '../config';

// Helper to get date string YYYY-MM-DD in Asia/Tashkent
const getTashkentDateString = (): string => {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  const formatter = new Intl.DateTimeFormat('en-CA', options); // returns YYYY-MM-DD
  return formatter.format(new Date());
};

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Avtorizatsiyadan o\'tilmagan' });

    const { text, locationAddress, latitude, longitude } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Buyurtma matnini kiriting (masalan: sut, yog\', shakar)' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });

    // 1. Get real store Telegram ID from environment
    const mainStoreTelegramId = (process.env.STORE_QORGANABOD_1_TELEGRAM_ID || '6473433651').trim();

    // 2. Remove all dummy fake stores so Round-Robin doesn't send orders into empty space
    await prisma.store.deleteMany({
      where: {
        telegramId: {
          in: ['111111111', '222222222', '333333333', '444444444', '123456789', '000000000', 'test']
        }
      }
    });

    // 3. Ensure the genuine store exists in the database
    const primaryStore = await prisma.store.upsert({
      where: { telegramId: mainStoreTelegramId },
      update: { name: "1-Qorg'anabod MFY Do'koni", isActive: true },
      create: {
        name: "1-Qorg'anabod MFY Do'koni",
        telegramId: mainStoreTelegramId,
        isActive: true,
        orderCount: 0,
      },
    });

    // 4. Fetch all active stores with valid Telegram IDs
    const activeStores = await prisma.store.findMany({
      where: {
        isActive: true,
        telegramId: {
          notIn: ['111111111', '222222222', '333333333', '444444444', '123456789', '000000000', 'test']
        }
      },
      orderBy: { orderCount: 'asc' },
    });

    const assignedStore = activeStores.length > 0 ? activeStores[0] : primaryStore;
    const storeRecipient = assignedStore?.telegramId || mainStoreTelegramId;

    // 5. Create Order in DB
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        phone: user.phone,
        userName: `${user.firstName} ${user.lastName}`.trim(),
        text: text.trim(),
        locationAddress: locationAddress || 'Joylashuv xaritada ko\'rsatildi',
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        status: 'PENDING',
        assignedStoreId: assignedStore?.id || primaryStore.id,
      },
    });

    if (assignedStore) {
      await prisma.store.update({
        where: { id: assignedStore.id },
        data: { orderCount: { increment: 1 } },
      });
    }

    // 6. Send alert to Store via Telegram Bot with native location pin & Google/Yandex maps
    console.log(`📦 Sending Order #${order.id} to Telegram Store ID: ${storeRecipient}`);
    await sendOrderToStore(storeRecipient, {
      id: order.id,
      userName: order.userName,
      phone: order.phone,
      text: order.text,
      locationAddress: order.locationAddress || '',
      latitude: order.latitude,
      longitude: order.longitude,
      createdAt: order.createdAt,
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: 'PENDING',
        note: `Buyurtma yaratildi va ${assignedStore ? assignedStore.name : "do'kon"}ga yuborildi`,
      },
    });

    return res.json({
      success: true,
      message: 'Buyurtmangiz muvaffaqiyatli qabul qilindi va do\'konga yuborildi!',
      order,
    });
  } catch (err: any) {
    console.error('createOrder error:', err);
    return res.status(500).json({ success: false, message: 'Buyurtma berishda xatolik: ' + err.message });
  }
};

export const getUserOrders = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Avtorizatsiyadan o\'tilmagan' });

    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: {
        assignedStore: {
          select: { name: true },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      orders,
      canOrderToday: true,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Buyurtmalarni olishda xatolik' });
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const validStatuses = ['PENDING', 'ACCEPTED', 'REJECTED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Yaroqsiz status' });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!order) return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });

    if (status === 'DELIVERED' && order.status !== 'DELIVERED') {
      // Atomic delivery status & +8 coins reward
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id },
          data: { status: 'DELIVERED', coinRewarded: true, deliveredAt: new Date() },
        });

        await tx.orderStatusHistory.create({
          data: { orderId: id, status: 'DELIVERED', note: note || 'Yetkazib berildi' },
        });

        if (!order.coinRewarded) {
          const coinBalance = await tx.coinBalance.findUnique({
            where: { userId: order.userId },
          });

          if (coinBalance) {
            await tx.coinBalance.update({
              where: { userId: order.userId },
              data: {
                balance: { increment: 8 },
                totalEarned: { increment: 8 },
              },
            });
          } else {
            await tx.coinBalance.create({
              data: { userId: order.userId, balance: 8, totalEarned: 8 },
            });
          }

          await tx.coinTransaction.create({
            data: {
              userId: order.userId,
              amount: 8,
              type: 'ORDER_REWARD',
              description: '🛒 Buyurtma yetkazildi bonus coin',
              referenceId: id,
            },
          });

          await tx.notification.create({
            data: {
              userId: order.userId,
              title: '🎉 Buyurtma yetkazildi! (+8 Coin)',
              message: `Buyurtmangiz muvaffaqiyatli yetkazildi va hisobingizga +8 Coin qo'shildi.`,
            },
          });
        }
      });
    } else {
      await prisma.order.update({
        where: { id },
        data: { status },
      });

      await prisma.orderStatusHistory.create({
        data: { orderId: id, status, note: note || `Status ${status} ga o'zgartirildi` },
      });
    }

    return res.json({ success: true, message: `Buyurtma statusi ${status} ga yangilandi` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Server xatoligi: ' + err.message });
  }
};
