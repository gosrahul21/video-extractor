import { Queue, Worker } from 'bullmq';
import { redisConnection } from '../config/redis.js';
import { processWorkoutVideo } from '../services/workoutService.js';

export const QUEUE_NAME = 'workout-extraction';

// 1. Queue Setup
export const workoutQueue = new Queue(QUEUE_NAME, {
  connection: redisConnection
});

// 2. Worker Setup (This listens to the queue and processes jobs)
export const workoutWorker = new Worker(QUEUE_NAME, async (job) => {
  console.log(`[Worker] Started processing job ${job.id}`);
  const { url, user_id } = job.data;
  
  // Call our existing reusable service!
  const result = await processWorkoutVideo(url, user_id);
  
  // The returned result will be saved in Redis as job.returnvalue
  return result;
}, {
  connection: redisConnection,
  concurrency: 2 // Max 2 videos processing at the same time to save RAM/CPU
});

import { sendWorkoutPushNotification } from '../services/notificationService.js';

workoutWorker.on('completed', async (job) => {
  console.log(`[Worker] Job ${job.id} completed successfully!`);
  await sendWorkoutPushNotification(job.data?.user_id);
});

workoutWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job.id} failed:`, err);
});

