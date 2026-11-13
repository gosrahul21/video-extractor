import { processWorkoutVideo } from './services/workoutService.js';
import { sendWorkoutPushNotification } from './services/notificationService.js';
import { jobService } from './services/jobService.js';
import { classifyJobError } from './utils/errorClassifier.js';

/**
 * AWS Lambda SQS Event Handler (Worker)
 * Dedicated strictly to background video processing
 */
export const handler = async (event, context) => {
  console.log(`[Worker] Lambda invoked with ${event?.Records?.length || 0} SQS record(s).`);

  if (!event?.Records || event.Records.length === 0) {
    return { statusCode: 200, body: 'No records to process' };
  }

  for (const record of event.Records) {
    let payload;
    try {
      payload = JSON.parse(record.body);
    } catch (parseErr) {
      console.error('[Worker] Failed to parse SQS record body:', record.body);
      continue;
    }

    const { jobId, url, userId } = payload;
    console.log(`[Worker] Processing Job ID: ${jobId} for User: ${userId}...`);

    try {
      if (jobId) {
        await jobService.updateJob(jobId, { state: 'active' });
      }

      const result = await processWorkoutVideo(url, userId);
      console.log(`[Worker] Job ${jobId} completed successfully!`);

      if (jobId) {
        await jobService.updateJob(jobId, {
          state: 'completed',
          result,
          error: null,
          failed_reason: null
        });
      }

      await sendWorkoutPushNotification(userId);
    } catch (err) {
      console.error(`[Worker] Job ${jobId} failed:`, err);
      const classified = classifyJobError(err);

      if (jobId) {
        try {
          await jobService.updateJob(jobId, {
            state: 'failed',
            failed_reason: classified.message,
            error: classified
          });
        } catch (dbErr) {
          console.error(`[Worker] Failed to update error state for job ${jobId}:`, dbErr);
        }
      }
    }
  }

  return { statusCode: 200, body: 'Batch processing finished' };
};
