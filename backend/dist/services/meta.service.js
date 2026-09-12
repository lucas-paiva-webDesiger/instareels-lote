"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaApiService = void 0;
const axios_1 = __importDefault(require("axios"));
const META_API_URL = 'https://graph.facebook.com';
const META_API_VERSION = process.env.META_API_VERSION || 'v19.0';
class MetaApiService {
    get baseUrl() {
        return `${META_API_URL}/${META_API_VERSION}`;
    }
    // Troca token curto por um de longa duração
    async getLongLivedAccessToken(shortLivedToken) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/oauth/access_token`, {
                params: {
                    grant_type: 'fb_exchange_token',
                    client_id: process.env.META_APP_ID,
                    client_secret: process.env.META_APP_SECRET,
                    fb_exchange_token: shortLivedToken,
                },
            });
            return response.data.access_token;
        }
        catch (error) {
            console.error('Error exchanging token:', error.response?.data || error.message);
            throw new Error('Failed to get long-lived access token');
        }
    }
    // Busca páginas do Facebook do usuário
    async getUserPages(accessToken) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/me/accounts`, {
                params: {
                    access_token: accessToken,
                },
            });
            return response.data.data; // Array of pages { id, name, access_token }
        }
        catch (error) {
            console.error('Error fetching pages:', error.response?.data || error.message);
            throw new Error('Failed to fetch user pages');
        }
    }
    // Busca a conta Instagram Business vinculada a uma página
    async getInstagramAccount(pageId, pageAccessToken) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/${pageId}`, {
                params: {
                    fields: 'instagram_business_account{id,username,name,profile_picture_url}',
                    access_token: pageAccessToken,
                },
            });
            return response.data.instagram_business_account;
        }
        catch (error) {
            console.error('Error fetching IG account:', error.response?.data || error.message);
            throw new Error('Failed to fetch Instagram account');
        }
    }
    // Cria um container de mídia (Upload)
    async createMediaContainer(igUserId, accessToken, videoUrl, caption, coverUrl) {
        try {
            const params = {
                media_type: 'REELS',
                video_url: videoUrl,
                access_token: accessToken,
            };
            if (caption)
                params.caption = caption;
            if (coverUrl)
                params.cover_url = coverUrl;
            const response = await axios_1.default.post(`${this.baseUrl}/${igUserId}/media`, null, { params });
            return response.data.id; // Container ID
        }
        catch (error) {
            console.error('Error creating media container:', error.response?.data || error.message);
            throw error;
        }
    }
    // Verifica status do container
    async getMediaContainerStatus(containerId, accessToken) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/${containerId}`, {
                params: {
                    fields: 'status_code,status',
                    access_token: accessToken,
                },
            });
            return response.data; // { status_code: "FINISHED" | "IN_PROGRESS" | "ERROR" }
        }
        catch (error) {
            console.error('Error checking container status:', error.response?.data || error.message);
            throw error;
        }
    }
    // Publica o container
    async publishMedia(igUserId, containerId, accessToken) {
        try {
            const response = await axios_1.default.post(`${this.baseUrl}/${igUserId}/media_publish`, null, {
                params: {
                    creation_id: containerId,
                    access_token: accessToken,
                },
            });
            return response.data.id; // Published Media ID
        }
        catch (error) {
            console.error('Error publishing media:', error.response?.data || error.message);
            throw error;
        }
    }
    // Busca métricas (Insights) do Reel
    async getReelInsights(mediaId, accessToken) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/${mediaId}/insights`, {
                params: {
                    metric: 'plays,reach,saved,shares,total_interactions,likes,comments',
                    access_token: accessToken,
                },
            });
            return response.data.data;
        }
        catch (error) {
            console.error('Error fetching reel insights:', error.response?.data || error.message);
            return [];
        }
    }
    // Busca métricas da Conta
    async getAccountInsights(igUserId, accessToken, since, until) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/${igUserId}/insights`, {
                params: {
                    metric: 'impressions,reach,profile_views,follower_count',
                    period: 'day',
                    since,
                    until,
                    access_token: accessToken,
                },
            });
            return response.data.data;
        }
        catch (error) {
            console.error('Error fetching account insights:', error.response?.data || error.message);
            return [];
        }
    }
}
exports.MetaApiService = MetaApiService;
