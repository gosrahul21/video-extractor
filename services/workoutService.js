import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { downloadVideo } from './downloadVideo.js';
import { uploadToGemini } from './uploadToGemini.js';
import { extractWorkoutWithGemini } from './extractWorkoutWithGemini.js';
import { saveWorkoutToDb } from './saveWorkoutToDb.js';
import { cleanupFiles } from './cleanupFiles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TMP_DIR = path.join(__dirname, '../tmp');
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

export const processWorkoutVideo = async (url, user_id) => {
  const filename = `${Date.now()}.mp4`;
  const filePath = path.join(TMP_DIR, filename);
  let geminiFile = null;

  try {
    // 1. Download
    const thumbnailUrl = await downloadVideo(url, filePath);

    // 2. Upload to Gemini
    geminiFile = await uploadToGemini(filePath, filename);

    // 3. Extract Workout
    const workoutData = await extractWorkoutWithGemini(geminiFile);

    // 4. Save to Database
    const workout_id = await saveWorkoutToDb(user_id, url, workoutData, thumbnailUrl);

    return { workout_id, workoutData };
  } finally {
    // 5. Cleanup
    await cleanupFiles(filePath, geminiFile);
  }
};
