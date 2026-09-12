import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getSettings = async (req: Request, res: Response) => {
  try {
    let settings = await prisma.systemSettings.findFirst();
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { id: "1", metaAppId: "", metaAppSecret: "", globalInterval: 60 }
      });
    }
    res.json({
      metaAppId: settings.metaAppId,
      metaAppSecret: settings.metaAppSecret,
      globalInterval: settings.globalInterval
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get settings' });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const { metaAppId, metaAppSecret, globalInterval } = req.body;
    let settings = await prisma.systemSettings.findFirst();
    
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { id: "1" }
      });
    }

    const updated = await prisma.systemSettings.update({
      where: { id: settings.id },
      data: {
        ...(metaAppId !== undefined && { metaAppId }),
        ...(metaAppSecret && { metaAppSecret }),
        ...(globalInterval !== undefined && { globalInterval: Number(globalInterval) }),
      }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
};
