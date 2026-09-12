import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import isoWeek from 'dayjs/plugin/isoWeek';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(isBetween);
dayjs.extend(isoWeek);
dayjs.extend(utc);
dayjs.extend(timezone);

const prisma = new PrismaClient();
const DEFAULT_TZ = 'America/Sao_Paulo';

export class QueueService {
  // Re-calcula os horários (scheduledAt) de todos os vídeos na fila (QUEUED) de uma conta
  async recalculateQueue(accountId: string) {
    const account = await prisma.instagramAccount.findUnique({ where: { id: accountId } });
    if (!account) return;

    const settings: any = JSON.parse(account.settings); // { intervalMinutes: 30, startTime: "08:00", endTime: "22:00", days: [1,2,3,4,5] }
    
    // Pega todos os vídeos enfileirados ordenados
    const queuedVideos = await prisma.video.findMany({
      where: { accountId, status: 'QUEUED' },
      orderBy: { scheduledAt: 'asc' } // Mantém a ordem atual
    });

    if (queuedVideos.length === 0) return;

    // Busca o último publicado para usar como base, se houver
    const lastPublished = await prisma.video.findFirst({
      where: { accountId, status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' }
    });

    let currentTime = dayjs().tz(DEFAULT_TZ);
    
    if (lastPublished && lastPublished.publishedAt) {
      const lastTime = dayjs(lastPublished.publishedAt).tz(DEFAULT_TZ);
      if (lastTime.add(settings.intervalMinutes, 'minute').isAfter(currentTime)) {
        currentTime = lastTime.add(settings.intervalMinutes, 'minute');
      }
    }

    for (const video of queuedVideos) {
      currentTime = this.getNextValidTime(currentTime, settings);
      
      await prisma.video.update({
        where: { id: video.id },
        data: { scheduledAt: currentTime.toDate() }
      });

      // Incrementa para o próximo vídeo
      currentTime = currentTime.add(settings.intervalMinutes, 'minute');
    }
  }

  // Encontra o próximo horário válido com base nas configurações
  private getNextValidTime(baseTime: dayjs.Dayjs, settings: any): dayjs.Dayjs {
    let nextTime = baseTime.clone();
    
    const [startHour, startMinute] = (settings.startTime || "00:00").split(':').map(Number);
    const [endHour, endMinute] = (settings.endTime || "23:59").split(':').map(Number);
    const validDays = settings.days || [1, 2, 3, 4, 5, 6, 7]; // 1 = Monday, 7 = Sunday

    let attempts = 0;
    while (attempts < 100) { // Safety limit
      const currentDay = nextTime.isoWeekday();
      
      if (!validDays.includes(currentDay)) {
        // Pula pro próximo dia
        nextTime = nextTime.add(1, 'day').hour(startHour).minute(startMinute).second(0);
        continue;
      }

      const startTimeToday = nextTime.clone().hour(startHour).minute(startMinute).second(0);
      const endTimeToday = nextTime.clone().hour(endHour).minute(endMinute).second(0);

      if (nextTime.isBefore(startTimeToday)) {
        nextTime = startTimeToday;
      } else if (nextTime.isAfter(endTimeToday)) {
        // Pula pro próximo dia
        nextTime = nextTime.add(1, 'day').hour(startHour).minute(startMinute).second(0);
        continue;
      }

      // É válido
      return nextTime;
      attempts++;
    }

    return nextTime;
  }
}
