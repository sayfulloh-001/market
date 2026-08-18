import { Response } from 'express';
import { prisma } from '../db/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getContacts = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string || '').trim();
    const skip = (page - 1) * limit;

    const whereClause: any = {
      isBlocked: false,
    };

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { phone: { contains: search } },
        { mahalla: { contains: search } },
      ];
    }

    const [contacts, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          photoUrl: true,
          mahalla: true,
          isFaceVerified: true,
          createdAt: true,
        },
        orderBy: { firstName: 'asc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    return res.json({
      success: true,
      data: contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('getContacts error:', err);
    return res.status(500).json({ success: false, message: 'Kontaktlarni yuklashda xatolik' });
  }
};
