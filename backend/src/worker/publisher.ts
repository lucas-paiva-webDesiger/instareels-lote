import { PrismaClient } from '@prisma/client';
import { MetaApiService } from '../services/meta.service';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';

const prisma = new PrismaClient();
const metaService = new MetaApiService();

// Função auxiliar para esperar
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class PublisherWorker {
  private isRunning = false;

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('Publisher Worker started');

    while (this.isRunning) {
      try {
        await this.processNextInQueue();
      } catch (error) {
        console.error('Worker error:', error);
      }
      // Espera 10 segundos antes de verificar novamente
      await sleep(10000);
    }
  }

  stop() {
    this.isRunning = false;
  }

  private async processNextInQueue() {
    const now = new Date();

    // Iniciar uma transação para buscar e "travar" o próximo vídeo
    const result = await prisma.$transaction(async (tx) => {
      
      const video = await tx.video.findFirst({
        where: {
          status: 'QUEUED',
          OR: [
            { scheduledAt: null },
            { scheduledAt: { lte: now } }
          ],
          account: {
            isAutomationPaused: false
          }
        },
        orderBy: { createdAt: 'asc' }, // Usa createdAt pra fila normal em vez de scheduledAt
        include: { account: true }
      });

      if (!video) return null;

      const videoToProcess = await tx.video.update({
        where: { id: video.id },
        data: { status: 'PROCESSING', attempts: { increment: 1 } }
      });

      return {
        ...videoToProcess,
        accessToken: video.account.accessToken,
        instagramId: video.account.instagramId
      };
    });

    if (!result) return; // Nada para processar

    console.log(`Processing video ${result.id} for account ${result.accountId}`);
    await this.publishVideo(result);
  }

  private async publishVideo(video: any) {
    try {
      const finalVideoUrl = video.fileUrl;
      const finalCoverUrl = video.coverUrl || undefined;

      // 1. Criar container
      const containerId = await metaService.createMediaContainer(
        video.instagramId, 
        video.accessToken,
        finalVideoUrl,
        video.caption,
        finalCoverUrl
      );

      // 2. Aguardar processamento da Meta (polling)
      let isReady = false;
      let statusResponse = null;
      let checkAttempts = 0;

      while (!isReady && checkAttempts < 15) { // Espera até 2.5 min
        await sleep(10000); // 10 segundos
        statusResponse = await metaService.getMediaContainerStatus(containerId, video.accessToken);
        
        if (statusResponse.status_code === 'FINISHED') {
          isReady = true;
        } else if (statusResponse.status_code === 'ERROR') {
          throw new Error(`Meta API Container ERROR: ${statusResponse.status || 'Unknown error during processing'}`);
        }
        checkAttempts++;
      }

      if (!isReady) {
        throw new Error('Container processing timeout');
      }

      // 3. Publicar container
      const publishedMediaId = await metaService.publishMedia(
        video.instagramId, 
        containerId, 
        video.accessToken
      );

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

    } catch (error: any) {
      console.error(`Error publishing video ${video.id}:`, error.message);
      
      // Lógica de retry
      try {
        if (video.attempts >= 3) {
          await prisma.video.update({
            where: { id: video.id },
            data: { status: 'FAILED', errorMessage: error.message }
          });
        } else {
          await prisma.video.update({
            where: { id: video.id },
            data: { status: 'QUEUED', errorMessage: error.message } 
          });
        }
      } catch (dbError) {
        console.error(`O vídeo ${video.id} foi apagado do banco de dados enquanto estava sendo processado.`);
      }
    }
  }
}
