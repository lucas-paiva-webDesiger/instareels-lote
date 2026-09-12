import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const META_API_URL = 'https://graph.facebook.com';
const META_API_VERSION = process.env.META_API_VERSION || 'v19.0';

export class MetaApiService {
  private get baseUrl() {
    return `${META_API_URL}/${META_API_VERSION}`;
  }

  // Troca authorization code por access_token
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
    const settings = await prisma.systemSettings.findFirst();
    if (!settings || !settings.metaAppId || !settings.metaAppSecret) {
      throw new Error('Meta App credentials not configured in settings');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/oauth/access_token`, {
        params: {
          client_id: settings.metaAppId.trim(),
          redirect_uri: redirectUri,
          client_secret: settings.metaAppSecret.trim(),
          code,
        },
      });
      return response.data.access_token;
    } catch (error: any) {
      console.error('Error exchanging OAuth code:', error.response?.data || error.message);
      const fbError = error.response?.data?.error?.message || error.message;
      throw new Error(`Meta API: ${fbError}`);
    }
  }

  // Troca token curto por um de longa duração
  async getLongLivedAccessToken(shortLivedToken: string): Promise<string> {
    try {
      const settings = await prisma.systemSettings.findFirst();
      if (!settings || !settings.metaAppId || !settings.metaAppSecret) {
        throw new Error('Meta App credentials not configured in settings');
      }

      const response = await axios.get(`${this.baseUrl}/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: settings.metaAppId.trim(),
          client_secret: settings.metaAppSecret.trim(),
          fb_exchange_token: shortLivedToken,
        },
      });
      return response.data.access_token;
    } catch (error: any) {
      console.error('Error exchanging token:', error.response?.data || error.message);
      const fbError = error.response?.data?.error?.message || error.message;
      throw new Error(`Meta API (Long Lived): ${fbError}`);
    }
  }

  // Busca páginas do Facebook e suas contas IG de uma vez
  async getUserPages(accessToken: string): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/me/accounts`, {
        params: {
          fields: 'id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}',
          access_token: accessToken,
        },
      });
      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching pages:', error.response?.data || error.message);
      const fbError = error.response?.data?.error?.message || error.message;
      throw new Error(`Meta API (Pages): ${fbError}`);
    }
  }

  // Busca a conta Instagram Business vinculada a uma página
  async getInstagramAccount(pageId: string, pageAccessToken: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/${pageId}`, {
        params: {
          fields: 'instagram_business_account{id,username,name,profile_picture_url}',
          access_token: pageAccessToken,
        },
      });
      return response.data.instagram_business_account;
    } catch (error: any) {
      console.error('Error fetching IG account:', error.response?.data || error.message);
      throw new Error('Failed to fetch Instagram account');
    }
  }

  // Cria um container de mídia (Upload)
  async createMediaContainer(igUserId: string, accessToken: string, videoUrl: string, caption?: string, coverUrl?: string) {
    try {
      const params: any = {
        media_type: 'REELS',
        video_url: videoUrl,
        access_token: accessToken,
      };

      if (caption) params.caption = caption;
      if (coverUrl) params.cover_url = coverUrl;

      const response = await axios.post(`${this.baseUrl}/${igUserId}/media`, null, { params });
      return response.data.id; // Container ID
    } catch (error: any) {
      const fbError = error.response?.data?.error?.message || error.message;
      console.error('Error creating media container:', error.response?.data || error.message);
      throw new Error(fbError);
    }
  }

  // Verifica status do container
  async getMediaContainerStatus(containerId: string, accessToken: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/${containerId}`, {
        params: {
          fields: 'status_code,status',
          access_token: accessToken,
        },
      });
      return response.data; // { status_code: "FINISHED" | "IN_PROGRESS" | "ERROR" }
    } catch (error: any) {
      console.error('Error checking container status:', error.response?.data || error.message);
      throw error;
    }
  }

  // Publica o container
  async publishMedia(igUserId: string, containerId: string, accessToken: string) {
    try {
      const response = await axios.post(`${this.baseUrl}/${igUserId}/media_publish`, null, {
        params: {
          creation_id: containerId,
          access_token: accessToken,
        },
      });
      return response.data.id; // Published Media ID
    } catch (error: any) {
      console.error('Error publishing media:', error.response?.data || error.message);
      throw error;
    }
  }

  // Busca métricas (Insights) do Reel
  async getReelInsights(mediaId: string, accessToken: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/${mediaId}/insights`, {
        params: {
          metric: 'plays,reach,saved,shares,total_interactions,likes,comments',
          access_token: accessToken,
        },
      });
      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching reel insights:', error.response?.data || error.message);
      return [];
    }
  }

  // Busca métricas da Conta
  async getAccountInsights(igUserId: string, accessToken: string, since: number, until: number) {
    try {
      const response = await axios.get(`${this.baseUrl}/${igUserId}/insights`, {
        params: {
          metric: 'impressions,reach,profile_views,follower_count',
          period: 'day',
          since,
          until,
          access_token: accessToken,
        },
      });
      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching account insights:', error.response?.data || error.message);
      return [];
    }
  }
}
