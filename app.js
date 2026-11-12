import express from 'express';
import dotenv from 'dotenv';
import { extractWorkout, getJobStatus } from './controllers/workoutController.js';

dotenv.config();

export const app = express();
app.use(express.json());

app.post('/api/extract-workout', extractWorkout);
app.get('/api/job-status/:id', getJobStatus);

app.get('/', (req, res) => {
  res.send({ status: 'ok', service: 'freakyfit-backend' });
});

app.get('/health', (req, res) => {
  res.send({
    success: true,
    health: 'ok',
  });
});

