import { Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../db/prisma';
import { config } from '../config';
import { AuthRequest } from '../middlewares/authMiddleware';
import { getTelegramBot } from '../services/telegramBot';

// Cryptographically secure random 6-digit code generator
const generateSecureOTP = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

export const requestTelegramAuth = async (req: AuthRequest, res: Response) => {
  try {
    let { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Telefon raqami kiritilishi shart' });
    }

    if (!phone.startsWith('+')) {
      phone = '+' + phone.replace(/\D/g, '');
    }

    // Cryptographically secure unique token and OTP code
    const telegramAuthToken = 'auth_' + crypto.randomBytes(12).toString('hex') + Date.now();
    const code = generateSecureOTP(); // Har gal Mutlaqo Har xil Tasodifiy Kod!
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 daqiqa amal qilish muddati

    await prisma.authVerification.upsert({
      where: { phone },
      update: {
        telegramAuthToken,
        code,
        isVerified: false,
        expiresAt,
      },
      create: {
        phone,
        telegramAuthToken,
        code,
        expiresAt,
      },
    });

    // Check if user has telegramId linked to send code directly
    const existingUser = await prisma.user.findUnique({ where: { phone } });
    if (existingUser && existingUser.telegramId) {
      const bot = getTelegramBot();
      if (bot) {
        bot.sendMessage(
          existingUser.telegramId,
          `🔐 *RAQAMLI MAHALLA BIR MARTALIK KODI*\n\nSizning shaxsiy va faqat bir marta ishlatiladigan kirish kodingiz: \`${code}\`\n\nUshbu kodni hechkimga bermang! Kod 5 daqiqa davomida amal qiladi.`,
          { parse_mode: 'Markdown' }
        ).catch(() => {});
      }
    }

    const botUsername = config.telegramBotUsername || 'Raqamli_mahallam_bot';
    const botLink = `https://t.me/${botUsername}?start=${telegramAuthToken}`;

    return res.json({
      success: true,
      phone,
      telegramAuthToken,
      botLink,
      message: 'Telegram orqali bir martalik unikal tasdiqlash kodi yaratildi',
    });
  } catch (err: any) {
    console.error('requestTelegramAuth error:', err);
    return res.status(500).json({ success: false, message: 'Server xatoligi: ' + err.message });
  }
};

export const verifyAuthCode = async (req: AuthRequest, res: Response) => {
  try {
    const { phone, code, telegramAuthToken } = req.body;
    if ((!phone && !telegramAuthToken) || !code) {
      return res.status(400).json({
        success: false,
        message: 'Telefon raqam va tasdiqlash kodi kiritilishi shart',
      });
    }

    let authRecord;
    if (telegramAuthToken) {
      authRecord = await prisma.authVerification.findUnique({
        where: { telegramAuthToken: String(telegramAuthToken) },
      });
    } else if (phone) {
      authRecord = await prisma.authVerification.findUnique({
        where: { phone: String(phone) },
      });
    }

    if (!authRecord) {
      return res.status(400).json({
        success: false,
        message: 'Tasdiqlash kodi so\'rovi topilmadi yoki muddati o\'tgan. Qaytadan kod so\'rang.',
      });
    }

    // Check expiration (5 minutes)
    if (new Date() > new Date(authRecord.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: '⏰ Tasdiqlash kodining 5 daqiqalik amal qilish muddati tugagan. Yangi kod so\'rang.',
      });
    }

    // Strict 6-digit code check
    if (authRecord.code.trim() !== String(code).trim()) {
      return res.status(400).json({
        success: false,
        isVerified: false,
        message: '❌ Noto\'g\'ri kod kiritildi! Telegram botga yuborilgan unikal 6 xonali kodni tekshirib qayta kiriting.',
      });
    }

    // Single-use code burn (immediate invalidation after use for maximum security)
    await prisma.authVerification.update({
      where: { id: authRecord.id },
      data: {
        isVerified: true,
        code: 'USED_' + crypto.randomBytes(8).toString('hex'), // Burn code so it can NEVER be reused!
      },
    });

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { phone: authRecord.phone },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: authRecord.phone,
          firstName: 'Foydalanuvchi',
          lastName: '',
          role: 'USER',
        },
      });
      await prisma.coinBalance.create({
        data: { userId: user.id, balance: 0 },
      });
    }

    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role },
      config.jwtSecret,
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      isVerified: true,
      message: '✅ Tasdiqlash muvaffaqiyatli o\'tdi!',
      token,
      user,
    });
  } catch (err: any) {
    console.error('verifyAuthCode error:', err);
    return res.status(500).json({ success: false, message: 'Server xatoligi: ' + err.message });
  }
};

export const checkAuthStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { telegramAuthToken, phone } = req.query;
    if (!telegramAuthToken && !phone) {
      return res.status(400).json({ success: false, message: 'Token yoki telefon kiritilmadi' });
    }

    let authRecord;
    if (telegramAuthToken) {
      authRecord = await prisma.authVerification.findUnique({
        where: { telegramAuthToken: String(telegramAuthToken) },
      });
    } else if (phone) {
      authRecord = await prisma.authVerification.findUnique({
        where: { phone: String(phone) },
      });
    }

    if (!authRecord || !authRecord.isVerified) {
      return res.json({
        success: false,
        isVerified: false,
        message: 'Telegram orqali tasdiqlash hali yakunlanmagan',
      });
    }

    let user = await prisma.user.findUnique({
      where: { phone: authRecord.phone },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: authRecord.phone,
          firstName: 'Foydalanuvchi',
          lastName: '',
          role: 'USER',
        },
      });
      await prisma.coinBalance.create({
        data: { userId: user.id, balance: 0 },
      });
    }

    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role },
      config.jwtSecret,
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      isVerified: true,
      token,
      user,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Server xatoligi: ' + err.message });
  }
};

export const uploadFacePhoto = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Avtorizatsiyadan o\'tilmagan' });
    if (!req.file) return res.status(400).json({ success: false, message: 'Yuz rasmi fayli yuklanmadi' });

    const photoUrl = `/uploads/${req.file.filename}`;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { photoUrl, isFaceVerified: true },
    });

    return res.json({
      success: true,
      message: 'Yuz rasmi muvaffaqiyatli saqlandi va tasdiqlandi!',
      user: updatedUser,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Rasm yuklashda xatolik' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Avtorizatsiyadan o\'tilmagan' });
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { coinBalance: true },
    });
    if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });
    return res.json({ success: true, user });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Server xatoligi' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Avtorizatsiyadan o\'tilmagan' });
    const { firstName, lastName, language } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(firstName !== undefined && { firstName: String(firstName).trim() }),
        ...(lastName !== undefined && { lastName: String(lastName).trim() }),
        ...(language && { language }),
      },
      include: {
        coinBalance: true,
      },
    });

    return res.json({ success: true, message: 'Profil muvaffaqiyatli yangilandi', user: updated });
  } catch (err: any) {
    console.error('updateProfile error:', err);
    return res.status(500).json({ success: false, message: 'Server xatoligi: ' + err.message });
  }
};
