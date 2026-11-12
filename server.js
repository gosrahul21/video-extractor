import express from 'express';
import dotenv from 'dotenv';
import { extractWorkout, getJobStatus } from './controllers/workoutController.js';

// Import the BullMQ queue/worker (Commented out while using in-memory queue)
// import './queues/workoutQueue.js';


dotenv.config();

const app = express();
app.use(express.json());

app.post('/api/extract-workout', extractWorkout);
app.get('/api/job-status/:id', getJobStatus);

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send({ status: 'ok', service: 'freakyfit-backend' });
});

app.get('/health', (req, res) => {
  res.send({
    success: true,
    health: 'ok',
  });
});

const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received: closing HTTP server gracefully...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});

