import serverlessExpress from '@codegenie/serverless-express';
import { app } from './app.js';

/**
 * AWS Lambda handler for API Gateway / HTTP API
 */
export const handler = serverlessExpress({ app });

