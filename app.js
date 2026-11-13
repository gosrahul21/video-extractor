import express from 'express';
import dotenv from 'dotenv';
import { extractWorkout, getJobStatus } from './controllers/workoutController.js';
import { requireAuth } from './middleware/authMiddleware.js';

dotenv.config();

export const app = express();
app.use(express.json());

// Public routes for monitoring and health checks
app.get('/', (req, res) => {
  res.send({ status: 'ok', service: 'freakyfit-backend' });
});

app.get('/health', (req, res) => {
  res.send({
    success: true,
    health: 'ok',
  });
});

// Protected routes (Requires Supabase Bearer token)
app.post('/api/extract-workout', requireAuth, extractWorkout);
app.get('/api/job-status/:id', requireAuth, getJobStatus);
