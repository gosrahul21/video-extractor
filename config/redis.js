import { Redis } from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

// BullMQ requires maxRetriesPerRequest to be null for IORedis
export const redisConnection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});
