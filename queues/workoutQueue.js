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

import { createClient } from '@supabase/supabase-js';
import { Expo } from 'expo-server-sdk';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: 'freakyfit' } }
);
const expo = new Expo();

workoutWorker.on('completed', async (job) => {
  console.log(`[Worker] Job ${job.id} completed successfully!`);
  try {
    const userId = job.data.user_id;
    if (!userId) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', userId)
      .single();

    if (profile && profile.push_token && Expo.isExpoPushToken(profile.push_token)) {
      await expo.sendPushNotificationsAsync([{
        to: profile.push_token,
        sound: 'default',
        title: 'Workout Extracted!',
        body: 'Your video has been successfully processed and added to your library.'
      }]);
      console.log(`[Worker] Push notification sent to ${userId}`);
    }
  } catch (err) {
    console.error('[Worker] Push notification error:', err);
  }
});

workoutWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job.id} failed:`, err);
});
