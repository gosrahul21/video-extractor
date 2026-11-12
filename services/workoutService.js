import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { downloadVideo } from './downloadVideo.js';
import { uploadToGemini } from './uploadToGemini.js';
import { extractWorkoutWithGemini } from './extractWorkoutWithGemini.js';
import { saveWorkoutToDb } from './saveWorkoutToDb.js';
import { cleanupFiles } from './cleanupFiles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In AWS Lambda, only /tmp (os.tmpdir()) is writable
const TMP_DIR = process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT
  ? os.tmpdir()
  : path.join(__dirname, '../tmp');

if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

const runStage = async (stage, fn) => {
  try {
    return await fn();
  } catch (err) {
    if (err && typeof err === 'object' && !err.stage) {
      err.stage = stage;
    }
    throw err;
  }
};

export const processWorkoutVideo = async (url, user_id) => {
  const filename = `${Date.now()}.mp4`;
  const filePath = path.join(TMP_DIR, filename);
  let geminiFile = null;

  try {
    // 1. Download
    const thumbnailUrl = await runStage('download', () => downloadVideo(url, filePath));

    // 2. Upload to Gemini
    geminiFile = await runStage('upload', () => uploadToGemini(filePath, filename));

    // 3. Extract Workout
    const workoutData = await runStage('extract', () => extractWorkoutWithGemini(geminiFile));

    // 4. Save to Database
    const workout_id = await runStage('save', () => saveWorkoutToDb(user_id, url, workoutData, thumbnailUrl));

    return { workout_id, workoutData };
  } finally {
    // 5. Cleanup
    await cleanupFiles(filePath, geminiFile);
  }
};
