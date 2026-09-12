import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

import authRoutes from './routes/auth.routes';
import accountRoutes from './routes/account.routes';
import videoRoutes from './routes/video.routes';
import settingsRoutes from './routes/settings.routes';
import path from 'path';

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(process.env.STORAGE_PATH || path.join(process.cwd(), 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/settings', settingsRoutes);

// Alias para o callback OAuth (caso já esteja configurado assim no Meta)
import { metaOAuthCallback } from './controllers/meta.auth.controller';
app.get('/api/auth/meta/callback', metaOAuthCallback);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

import { startWorker } from './worker';

app.listen(PORT, () => {
  console.log(`Reels Manager Backend running on port ${PORT}`);
  startWorker();
});
