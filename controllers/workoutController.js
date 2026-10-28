// --- BullMQ Queue Implementation (Preserved for future use) ---
// import { workoutQueue } from '../queues/workoutQueue.js';
//
// export const extractWorkoutBullMQ = async (req, res) => {
//   const { url, user_id } = req.body;
//   if (!url || !user_id) {
//     return res.status(400).json({ error: 'Missing url or user_id in request body' });
//   }
//   try {
//     const job = await workoutQueue.add('extract-workout', { url, user_id });
//     res.status(202).json({ 
//       success: true, 
//       job_id: job.id, 
//       message: 'Video added to processing queue.' 
//     });
//   } catch (error) {
//     console.error('Error adding job to queue:', error);
//     res.status(500).json({ error: error.message });
//   }
// };
//
// export const getJobStatusBullMQ = async (req, res) => {
//   const { id } = req.params;
//   try {
//     const job = await workoutQueue.getJob(id);
//     if (!job) {
//       return res.status(404).json({ error: 'Job not found' });
//     }
//     const state = await job.getState();
//     const result = job.returnvalue;
//     const failedReason = job.failedReason;
//     res.status(200).json({ job_id: id, state, result, failedReason });
//   } catch (error) {
//     console.error('Error fetching job status:', error);
//     res.status(500).json({ error: error.message });
//   }
// };

// --- In-Memory Sequential Queue Implementation ---
import { inMemoryQueue } from '../queues/inMemoryQueue.js';

export const extractWorkout = async (req, res) => {
  const { url, user_id } = req.body;

  if (!url || !user_id) {
    return res.status(400).json({ error: 'Missing url or user_id in request body' });
  }

  try {
    // Add job to in-memory queue (processes one-by-one sequentially)
    const job = inMemoryQueue.addJob({ url, user_id });

    // Return job id immediately (same asynchronous API pattern)
    res.status(202).json({ 
      success: true, 
      job_id: job.id, 
      message: 'Video added to processing queue.' 
    });
  } catch (error) {
    console.error('Error adding job to in-memory queue:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getJobStatus = async (req, res) => {
  const { id } = req.params;

  try {
    const job = inMemoryQueue.getJob(id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.status(200).json({ 
      job_id: id,
      state: job.state,       // 'waiting' | 'active' | 'completed' | 'failed'
      result: job.result, 
      failedReason: job.failedReason 
    });
  } catch (error) {
    console.error('Error fetching job status:', error);
    res.status(500).json({ error: error.message });
  }
};
