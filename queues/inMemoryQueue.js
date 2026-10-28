import crypto from 'crypto';
import { processWorkoutVideo } from '../services/workoutService.js';
import { sendWorkoutPushNotification } from '../services/notificationService.js';

// In-memory storage for jobs
const jobs = new Map();
const queue = [];
let isProcessing = false;

// Cleanup completed/failed jobs older than 24 hours
const pruneOldJobs = () => {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  for (const [id, job] of jobs.entries()) {
    if ((job.state === 'completed' || job.state === 'failed') && job.completedAt && job.completedAt < oneDayAgo) {
      jobs.delete(id);
    }
  }
};

/**
 * Worker loop that processes jobs sequentially (one at a time)
 */
const processQueue = async () => {
  if (isProcessing) return;
  if (queue.length === 0) return;

  isProcessing = true;

  while (queue.length > 0) {
    const job = queue.shift();
    if (!job) continue;

    job.state = 'active';
    job.startedAt = Date.now();
    console.log(`[InMemoryQueue] Processing job ${job.id} for user ${job.data.user_id}...`);

    try {
      const result = await processWorkoutVideo(job.data.url, job.data.user_id);
      job.state = 'completed';
      job.result = result;
      job.completedAt = Date.now();
      console.log(`[InMemoryQueue] Job ${job.id} completed successfully!`);

      // Send push notification to user upon completion
      await sendWorkoutPushNotification(job.data.user_id);
    } catch (err) {
      console.error(`[InMemoryQueue] Job ${job.id} failed:`, err);
      job.state = 'failed';
      job.failedReason = err.message || String(err);
      job.completedAt = Date.now();
    }
  }

  isProcessing = false;
  pruneOldJobs();
};

export const inMemoryQueue = {
  /**
   * Add a new video extraction job to the in-memory queue
   */
  addJob: ({ url, user_id }) => {
    const id = crypto.randomUUID();
    const job = {
      id,
      data: { url, user_id },
      state: 'waiting', // 'waiting' | 'active' | 'completed' | 'failed'
      result: null,
      failedReason: null,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null
    };

    jobs.set(id, job);
    queue.push(job);

    console.log(`[InMemoryQueue] Job ${id} queued. Total pending: ${queue.length}`);

    // Trigger sequential processing
    processQueue();

    return job;
  },

  /**
   * Get job by ID
   */
  getJob: (id) => {
    return jobs.get(id) || null;
  }
};
