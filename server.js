import express from 'express';
import dotenv from 'dotenv';
import { extractWorkout, getJobStatus } from './controllers/workoutController.js';

// Import the queue/worker so it starts listening when server boots
import './queues/workoutQueue.js';

dotenv.config();

const app = express();
app.use(express.json());

app.post('/api/extract-workout', extractWorkout);
app.get('/api/job-status/:id', getJobStatus);

const PORT = process.env.PORT || 3000;

app.get('/health', (req,res)=>{
  res.send({
    success: true,
    health: 'ok',
  })
})

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
