import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: { id: string };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Zero-config: Garante que exista ao menos 1 usuário e o usa automaticamente
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: { email: 'admin@local.com', password: 'local' }
      });
    }

    req.user = { id: user.id };
    next();
  } catch (err) {
    res.status(500).json({ error: 'Auth middleware failed' });
  }
};
