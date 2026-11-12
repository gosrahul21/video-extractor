import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import dotenv from 'dotenv';
dotenv.config();

const region = process.env.AWS_REGION || 'us-east-1';
const queueUrl = process.env.SQS_QUEUE_URL;

const sqsClient = new SQSClient({ region });

export const sqsService = {
  isConfigured: () => Boolean(queueUrl),

  /**
   * Send video processing job to AWS SQS
   */
  async enqueueJob({ jobId, url, userId }) {
    if (!queueUrl) {
      throw new Error('SQS_QUEUE_URL is not configured');
    }

    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify({ jobId, url, userId }),
      MessageAttributes: {
        JobId: {
          DataType: 'String',
          StringValue: jobId
        }
      }
    });

    const response = await sqsClient.send(command);
    console.log(`[SQSService] Dispatched job ${jobId} to SQS message ID: ${response.MessageId}`);
    return response;
  }
};

