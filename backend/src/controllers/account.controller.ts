import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { MetaApiService } from '../services/meta.service';
import { oauthSessions } from './meta.auth.controller';

const prisma = new PrismaClient();
const metaService = new MetaApiService();

export const getAvailableAccounts = async (req: any, res: Response) => {
  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: 'Missing session_id' });

    const session = oauthSessions.get(session_id as string);
    if (!session) return res.status(404).json({ error: 'Session expired or invalid' });

    // Enviar sem o access_token para segurança do frontend
    const safeAccounts = session.accounts.map((acc: any) => ({
      instagramId: acc.instagramId,
      username: acc.username,
      name: acc.name,
      profilePictureUrl: acc.profilePictureUrl
    }));

    res.json(safeAccounts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch available accounts' });
  }
};

export const selectAccount = async (req: any, res: Response) => {
  try {
    const { session_id, instagramId, internalName } = req.body;
    const userId = req.user.id;

    const session = oauthSessions.get(session_id);
    if (!session || session.userId !== userId) {
      return res.status(403).json({ error: 'Invalid or expired session' });
    }

    const accountData = session.accounts.find((acc: any) => acc.instagramId === instagramId);
    if (!accountData) {
      return res.status(404).json({ error: 'Account not found in session' });
    }

    const accountsCount = await prisma.instagramAccount.count({ where: { userId } });
    if (accountsCount >= 6) {
      return res.status(400).json({ error: 'Limite de 6 contas atingido.' });
    }

    const existing = await prisma.instagramAccount.findFirst({
      where: { userId, instagramId }
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Esta conta já está conectada.' });
    }

    const account = await prisma.instagramAccount.create({
      data: {
        userId,
        name: internalName || accountData.name || `@${accountData.username}`,
        username: accountData.username,
        instagramId: accountData.instagramId,
        facebookPageId: accountData.facebookPageId,
        accessToken: accountData.accessToken, // Token salvo de forma segura no DB!
        profilePictureUrl: accountData.profilePictureUrl,
        settings: JSON.stringify({
          intervalMinutes: 60,
          startTime: '08:00',
          endTime: '22:00',
          days: [1, 2, 3, 4, 5, 6, 7]
        })
      }
    });

    // Limpar sessão
    oauthSessions.delete(session_id);

    res.status(201).json({ success: true, account: { id: account.id, username: account.username } });
  } catch (error: any) {
    console.error('Error selecting account:', error);
    res.status(500).json({ error: 'Failed to select account' });
  }
};

export const getAccounts = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const accounts = await prisma.instagramAccount.findMany({
      where: { userId },
      include: {
        _count: {
          select: { videos: true }
        }
      }
    });

    // Remover token da resposta
    const sanitizedAccounts = accounts.map(acc => {
      const { accessToken, ...rest } = acc;
      return rest;
    });

    res.json(sanitizedAccounts);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get accounts' });
  }
};

export const updateAccountSettings = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { settings, isAutomationPaused } = req.body;

    const account = await prisma.instagramAccount.findFirst({
      where: { id, userId }
    });

    if (!account) return res.status(404).json({ error: 'Account not found' });

    const updated = await prisma.instagramAccount.update({
      where: { id },
      data: {
        ...(settings && { settings: typeof settings === 'string' ? settings : JSON.stringify(settings) }),
        ...(isAutomationPaused !== undefined && { isAutomationPaused })
      }
    });

    const { accessToken, ...rest } = updated;
    res.json(rest);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update account settings' });
  }
};

export const deleteAccount = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const account = await prisma.instagramAccount.findFirst({
      where: { id, userId }
    });

    if (!account) return res.status(404).json({ error: 'Account not found' });

    // Em uma deleção real, remover ou soft-delete vídeos associados
    await prisma.instagramAccount.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
};
