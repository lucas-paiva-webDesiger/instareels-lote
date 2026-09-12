import { PublisherWorker } from './publisher';

export const startWorker = () => {
  const worker = new PublisherWorker();
  
  // Start em background
  worker.start().catch(console.error);

  // Tratamento de encerramento
  process.on('SIGTERM', () => worker.stop());
  process.on('SIGINT', () => worker.stop());
  
  return worker;
};
