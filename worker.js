import serverlessExpress from '@codegenie/serverless-express';
import { app } from './app.js';
import { processWorkoutVideo } from './services/workoutService.js';
import { sendWorkoutPushNotification } from './services/notificationService.js';
import { jobService } from './services/jobService.js';
import { classifyJobError } from './utils/errorClassifier.js';

const httpHandler = serverlessExpress({ app });

/**
 * Unified AWS Lambda Handler
 * Handles both:
 * 1. Background SQS events (Video downloads + Gemini extraction)
 * 2. HTTP web traffic (Function URL / API Gateway for Express app)
 */
export const handler = async (event, context) => {
  // 1. If triggered by an AWS SQS queue event:
  if (event?.Records && event.Records[0]?.eventSource === 'aws:sqs') {
    console.log(`[Worker] Lambda invoked with ${event.Records.length} SQS record(s).`);

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
  }

  // 2. Otherwise, route HTTP request through Express (Function URL / API Gateway)
  return httpHandler(event, context);
};
