"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAccount = exports.updateAccountSettings = exports.getAccounts = exports.connectAccount = void 0;
const client_1 = require("@prisma/client");
const meta_service_1 = require("../services/meta.service");
const prisma = new client_1.PrismaClient();
const metaService = new meta_service_1.MetaApiService();
const connectAccount = async (req, res) => {
    try {
        const { shortLivedToken, pageId, pageAccessToken, instagramBusinessId, name, username } = req.body;
        const userId = req.user.id;
        // Verificar se o usuário já atingiu o limite de 6 contas
        const accountsCount = await prisma.instagramAccount.count({
            where: { userId }
        });
        if (accountsCount >= 6) {
            return res.status(400).json({ error: 'Limit of 6 connected accounts reached' });
        }
        // Obter token longo
        const longLivedToken = await metaService.getLongLivedAccessToken(shortLivedToken);
        // Salvar no banco
        const account = await prisma.instagramAccount.create({
            data: {
                userId,
                name,
                username,
                instagramId: instagramBusinessId,
                facebookPageId: pageId,
                accessToken: longLivedToken, // Em produção real, este token deve ser criptografado via KMS/Crypto
                settings: {
                    intervalMinutes: 60,
                    startTime: '08:00',
                    endTime: '22:00',
                    days: [1, 2, 3, 4, 5, 6, 7]
                }
            }
        });
        res.status(201).json(account);
    }
    catch (error) {
        console.error('Error connecting account:', error);
        res.status(500).json({ error: 'Failed to connect account', details: error.message });
    }
};
exports.connectAccount = connectAccount;
const getAccounts = async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to get accounts' });
    }
};
exports.getAccounts = getAccounts;
const updateAccountSettings = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { settings, isAutomationPaused } = req.body;
        const account = await prisma.instagramAccount.findFirst({
            where: { id, userId }
        });
        if (!account)
            return res.status(404).json({ error: 'Account not found' });
        const updated = await prisma.instagramAccount.update({
            where: { id },
            data: {
                ...(settings && { settings }),
                ...(isAutomationPaused !== undefined && { isAutomationPaused })
            }
        });
        const { accessToken, ...rest } = updated;
        res.json(rest);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update account settings' });
    }
};
exports.updateAccountSettings = updateAccountSettings;
const deleteAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const account = await prisma.instagramAccount.findFirst({
            where: { id, userId }
        });
        if (!account)
            return res.status(404).json({ error: 'Account not found' });
        // Em uma deleção real, remover ou soft-delete vídeos associados
        await prisma.instagramAccount.delete({
            where: { id }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete account' });
    }
};
exports.deleteAccount = deleteAccount;
