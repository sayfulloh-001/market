import { Response } from 'express';
import { prisma } from '../db/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';
import { sendApplicationToChairman } from '../services/telegramBot';

export const createApplication = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Avtorizatsiyadan o\'tilmagan' });
    const { title, message } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Ariza mavzusini kiriting' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });

    const application = await prisma.application.create({
      data: {
        userId: user.id,
        title: title.trim(),
        status: 'OPEN',
      },
    });

    const initialMsg = message && message.trim() ? message.trim() : title.trim();

    await prisma.applicationMessage.create({
      data: {
        applicationId: application.id,
        senderRole: 'USER',
        senderName: `${user.firstName} ${user.lastName}`.trim() || user.phone,
        content: initialMsg,
      },
    });

    // Notify Chairman via Telegram Bot
    await sendApplicationToChairman({
      id: application.id,
      userName: `${user.firstName} ${user.lastName}`.trim() || user.phone,
      phone: user.phone,
      title: initialMsg,
      createdAt: application.createdAt,
    });

    return res.json({
      success: true,
      message: 'Arizangiz mahalla raisiga muvaffaqiyatli yuborildi!',
      application,
    });
  } catch (err: any) {
    console.error('createApplication error:', err);
    return res.status(500).json({ success: false, message: 'Ariza yuborishda xatolik' });
  }
};

export const getUserApplications = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Avtorizatsiyadan o\'tilmagan' });

    const applications = await prisma.application.findMany({
      where: { userId: req.user.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, applications });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Arizalarni olishda xatolik' });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Avtorizatsiyadan o\'tilmagan' });
    const { applicationId, content } = req.body;

    if (!applicationId || !content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Xabar matni kiritilmagan' });
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { user: true },
    });

    if (!application) return res.status(404).json({ success: false, message: 'Ariza topilmadi' });

    // Authorization check
    if (application.userId !== req.user.id && req.user.role !== 'CHAIRMAN' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Ushbu chatga kirish ruxsati yo\'q' });
    }

    const senderRole = req.user.role === 'CHAIRMAN' ? 'CHAIRMAN' : 'USER';
    const senderName =
      senderRole === 'CHAIRMAN'
        ? 'Mahalla Raisi'
        : `${application.user.firstName} ${application.user.lastName}`.trim();

    const newMsg = await prisma.applicationMessage.create({
      data: {
        applicationId,
        senderRole,
        senderName,
        content: content.trim(),
      },
    });

    if (senderRole === 'USER') {
      await sendApplicationToChairman({
        id: application.id,
        userName: senderName,
        phone: application.user.phone,
        title: content.trim(),
        createdAt: newMsg.createdAt,
      });
    }

    return res.json({ success: true, message: newMsg });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Xabar yuborishda xatolik' });
  }
};
