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

// --- In-Memory & Cloud Queue Controller ---
import { inMemoryQueue } from '../queues/inMemoryQueue.js';
import { sqsService } from '../services/sqsService.js';
import { jobService } from '../services/jobService.js';

export const extractWorkout = async (req, res) => {
  const { url } = req.body;
  // Get verified user_id from Supabase token (fallback to req.body.user_id if not present)
  const user_id = req.user?.id || req.body.user_id;

  if (!url || !user_id) {
    return res.status(400).json({ error: 'Missing url or user_id in request' });
  }

  try {
    // 1. AWS Production Flow: SQS + Database Job Record
    if (sqsService.isConfigured()) {
      const job = await jobService.createJob({ url, user_id });
      await sqsService.enqueueJob({ jobId: job.id, url, userId: user_id });

      return res.status(202).json({
        success: true,
        job_id: job.id,
        message: 'Video added to processing queue.'
      });
    }

    // 2. Local Fallback Flow: In-Memory Queue
    const job = inMemoryQueue.addJob({ url, user_id });

    // Return job id immediately (same asynchronous API pattern)
    res.status(202).json({ 
      success: true, 
      job_id: job.id, 
      message: 'Video added to processing queue.' 
    });
  } catch (error) {
    console.error('Error adding job to queue:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getJobStatus = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. AWS Production Flow: Read from Database
    if (sqsService.isConfigured()) {
      const job = await jobService.getJob(id);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      // Ensure user can only view their own jobs
      if (req.user?.id && job.user_id && job.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden: You do not have access to this job' });
      }

      return res.status(200).json({
        job_id: job.id,
        state: job.state,       // 'waiting' | 'active' | 'completed' | 'failed'
        result: job.result,
        failedReason: job.failed_reason,
        error: job.error
      });
    }

    // 2. Local Fallback Flow: In-Memory Queue
    const job = inMemoryQueue.getJob(id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.status(200).json({ 
      job_id: id,
      state: job.state,       // 'waiting' | 'active' | 'completed' | 'failed'
      result: job.result, 
      failedReason: job.failedReason,
      error: job.error
    });
  } catch (error) {
    console.error('Error fetching job status:', error);
    res.status(500).json({ error: error.message });
  }
};
