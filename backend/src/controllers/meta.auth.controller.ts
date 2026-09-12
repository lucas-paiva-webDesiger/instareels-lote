import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { MetaApiService } from '../services/meta.service';

const prisma = new PrismaClient();
const metaService = new MetaApiService();

// Armazenamento temporário de sessões OAuth (Em memória)
// Em produção, isso deve ser um Redis ou Tabela no banco.
export const oauthSessions = new Map<string, any>();

export const startMetaOAuth = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const settings = await prisma.systemSettings.findFirst();
    if (!settings || !settings.metaAppId) {
      return res.status(400).json({ error: 'Meta App ID not configured' });
    }

    const appId = settings.metaAppId.trim();

    // Gerar state seguro
    const state = crypto.randomBytes(16).toString('hex');
    
    // Armazenar sessão inicial (10 minutos expiração ideal)
    oauthSessions.set(state, { userId, createdAt: Date.now() });

    const redirectUri = process.env.META_REDIRECT_URI || 'http://localhost:3000/api/auth/meta/callback';
    const scope = 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,business_management';

    const fbAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scope}`;
    
    console.log('REDIRECTING TO META:', fbAuthUrl);
    res.redirect(fbAuthUrl);
  } catch (error) {
    res.status(500).json({ error: 'Failed to start OAuth' });
  }
};

export const metaOAuthCallback = async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      return res.redirect(`http://localhost:5173/accounts?error=${encodeURIComponent(error_description as string)}`);
    }

    if (!code || !state) {
      return res.redirect(`http://localhost:5173/accounts?error=Missing+Code+or+State`);
    }

    // Validar State
    const sessionData = oauthSessions.get(state as string);
    if (!sessionData) {
      return res.redirect(`http://localhost:5173/accounts?error=Invalid+State`);
    }

    const redirectUri = process.env.META_REDIRECT_URI || 'http://localhost:3000/api/auth/meta/callback';
    
    // Trocar código por Token
    let shortLivedToken = await metaService.exchangeCodeForToken(code as string, redirectUri);
    let accessToken = await metaService.getLongLivedAccessToken(shortLivedToken);

    // Buscar páginas (agora já traz o instagram_business_account embutido)
    const pages = await metaService.getUserPages(accessToken);
    console.log(`[DEBUG] Pages found: ${pages.length}`);
    const availableAccounts = [];

    // Mapear as contas IG vinculadas
    for (const page of pages) {
      console.log(`[DEBUG] Checking Page: ${page.name}`);
      const igAccount = page.instagram_business_account;
      if (igAccount) {
        availableAccounts.push({
          instagramId: igAccount.id,
          username: igAccount.username,
          name: igAccount.name,
          profilePictureUrl: igAccount.profile_picture_url,
          facebookPageId: page.id,
          accessToken: accessToken 
        });
      }
    }
    console.log(`[DEBUG] Total available IG accounts: ${availableAccounts.length}`);

    // Criar uma Session ID final para o frontend selecionar
    const sessionId = crypto.randomBytes(16).toString('hex');
    oauthSessions.set(sessionId, {
      userId: sessionData.userId,
      accounts: availableAccounts,
      createdAt: Date.now()
    });

    // Limpar o state inicial
    oauthSessions.delete(state as string);

    // Redirecionar para o frontend para seleção
    res.redirect(`http://localhost:5173/accounts/select?session_id=${sessionId}`);
  } catch (err: any) {
    console.error('OAuth Callback Error:', err);
    res.redirect(`http://localhost:5173/accounts?error=${encodeURIComponent(err.message || 'Callback Failed')}`);
  }
};
