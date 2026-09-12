"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublisherWorker = void 0;
const client_1 = require("@prisma/client");
const meta_service_1 = require("../services/meta.service");
const prisma = new client_1.PrismaClient();
const metaService = new meta_service_1.MetaApiService();
// Função auxiliar para esperar
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
class PublisherWorker {
    isRunning = false;
    async start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        console.log('Publisher Worker started');
        while (this.isRunning) {
            try {
                await this.processNextInQueue();
            }
            catch (error) {
                console.error('Worker error:', error);
            }
            // Espera 10 segundos antes de verificar novamente
            await sleep(10000);
        }
    }
    stop() {
        this.isRunning = false;
    }
    async processNextInQueue() {
        const now = new Date();
        // Iniciar uma transação para buscar e "travar" o próximo vídeo
        const result = await prisma.$transaction(async (tx) => {
            // Usar query raw para usar FOR UPDATE SKIP LOCKED
            // Busca vídeos QUEUED que já passaram do horário, onde a conta não está pausada
            const videos = await tx.$queryRaw `
        SELECT v.*, a."accessToken", a."isAutomationPaused", a."instagramId" 
        FROM "Video" v
        JOIN "InstagramAccount" a ON v."accountId" = a.id
        WHERE v.status = 'QUEUED' 
          AND v."scheduledAt" <= ${now}
          AND a."isAutomationPaused" = false
        ORDER BY v."scheduledAt" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `;
            if (videos.length === 0)
                return null;
            const videoToProcess = videos[0];
            // Atualiza o status para evitar que outro worker pegue
            await tx.video.update({
                where: { id: videoToProcess.id },
                data: { status: 'PROCESSING', attempts: { increment: 1 } }
            });
            return videoToProcess;
        });
        if (!result)
            return; // Nada para processar
        console.log(`Processing video ${result.id} for account ${result.accountId}`);
        await this.publishVideo(result);
    }
    async publishVideo(video) {
        try {
            // 1. Criar container
            const containerId = await metaService.createMediaContainer(video.instagramId, // wait, we didn't fetch instagramId in raw query, we need it. 
            // Let's refetch account fully.
            video.accessToken, video.fileUrl, video.caption, video.coverUrl);
            // 2. Aguardar processamento da Meta (polling)
            let isReady = false;
            let statusResponse = null;
            let checkAttempts = 0;
            while (!isReady && checkAttempts < 15) { // Espera até 2.5 min
                await sleep(10000); // 10 segundos
                statusResponse = await metaService.getMediaContainerStatus(containerId, video.accessToken);
                if (statusResponse.status_code === 'FINISHED') {
                    isReady = true;
                }
                else if (statusResponse.status_code === 'ERROR') {
                    throw new Error('Meta API returned ERROR status for container');
                }
                checkAttempts++;
            }
            if (!isReady) {
                throw new Error('Container processing timeout');
            }
            // 3. Publicar container
            const publishedMediaId = await metaService.publishMedia(video.instagramId, containerId, video.accessToken);
            // 4. Marcar como publicado
            await prisma.video.update({
                where: { id: video.id },
                data: {
                    status: 'PUBLISHED',
                    metaMediaId: publishedMediaId,
                    publishedAt: new Date()
                }
            });
            console.log(`Video ${video.id} published successfully. Media ID: ${publishedMediaId}`);
        }
        catch (error) {
            console.error(`Error publishing video ${video.id}:`, error.message);
            // Lógica de retry
            if (video.attempts >= 3) {
                await prisma.video.update({
                    where: { id: video.id },
                    data: { status: 'FAILED', errorMessage: error.message }
                });
            }
            else {
                // Voltar pra fila para retentar (em produção idealmente aumenta o tempo de espera com delay)
                await prisma.video.update({
                    where: { id: video.id },
                    data: { status: 'QUEUED', errorMessage: error.message } // Volta pra fila
                });
            }
        }
    }
}
exports.PublisherWorker = PublisherWorker;
