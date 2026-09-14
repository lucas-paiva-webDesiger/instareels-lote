import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import axios from 'axios';

const prisma = new PrismaClient();

export const uploadVideo = async (req: any, res: Response) => {
  try {
    const file = req.file;
    const { accountId } = req.body;

    if (!file) return res.status(400).json({ error: 'No file uploaded' });
    if (!accountId) return res.status(400).json({ error: 'accountId is required' });

    const account = await prisma.instagramAccount.findFirst({
      where: { id: accountId, userId: req.user.id }
    });

    if (!account) return res.status(404).json({ error: 'Account not found' });

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
       return res.status(500).json({ error: 'Supabase credentials not configured' });
    }

    const fileBuffer = fs.readFileSync(file.path);
    
    await axios.post(`${supabaseUrl}/storage/v1/object/reels/${file.filename}`, fileBuffer, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': file.mimetype
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
    
    try { fs.unlinkSync(file.path); } catch (e) {}

    const fileUrl = `${supabaseUrl}/storage/v1/object/public/reels/${file.filename}`;

    const video = await prisma.video.create({
      data: {
        accountId,
        filename: file.originalname,
        fileUrl,
        status: 'READY'
      }
    });

    res.status(201).json(video);
  } catch (error: any) {
    console.error('Upload Error:', error.response?.data || error);
    res.status(500).json({ error: 'Failed to upload video' });
  }
};

export const uploadCover = async (req: any, res: Response) => {
  try {
    const file = req.file;
    const { id } = req.params;

    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
       return res.status(500).json({ error: 'Supabase credentials not configured' });
    }

    const fileBuffer = fs.readFileSync(file.path);
    
    await axios.post(`${supabaseUrl}/storage/v1/object/reels/${file.filename}`, fileBuffer, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': file.mimetype
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
    
    try { fs.unlinkSync(file.path); } catch (e) {}

    const coverUrl = `${supabaseUrl}/storage/v1/object/public/reels/${file.filename}`;

    const video = await prisma.video.update({
      where: { id },
      data: { coverUrl }
    });

    res.json(video);
  } catch (error: any) {
    console.error('Cover Upload Error:', error.response?.data || error);
    res.status(500).json({ error: 'Failed to upload cover' });
  }
};

export const getVideos = async (req: any, res: Response) => {
  try {
    const { accountId } = req.query;
    const userId = req.user.id;

    let whereClause: any = { account: { userId } };
    if (accountId) {
      whereClause.accountId = accountId;
    }

    const videos = await prisma.video.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
};

export const updateVideo = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { caption, coverUrl, status, accountId, scheduledAt } = req.body;

    const video = await prisma.video.findUnique({
      where: { id },
      include: { account: true }
    });

    if (!video || video.account.userId !== req.user.id) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const updated = await prisma.video.update({
      where: { id },
      data: {
        ...(caption !== undefined && { caption }),
        ...(coverUrl !== undefined && { coverUrl }),
        ...(status !== undefined && { status }),
        ...(accountId !== undefined && { accountId }),
        ...(scheduledAt !== undefined && { scheduledAt })
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update video' });
  }
};

export const deleteVideo = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    
    const video = await prisma.video.findUnique({
      where: { id },
      include: { account: true }
    });

    if (!video || video.account.userId !== req.user.id) {
      return res.status(404).json({ error: 'Video not found' });
    }

    await prisma.video.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete video' });
  }
};
