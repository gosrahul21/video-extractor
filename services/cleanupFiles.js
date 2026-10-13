import fs from 'fs';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import dotenv from 'dotenv';
dotenv.config();

const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);

export const cleanupFiles = async (filePath, geminiFile) => {
  console.log(`[Cleanup] Cleaning up temporary files...`);
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error('Failed to delete temporary video file:', err);
    }
  }
  if (geminiFile) {
    try {
      await fileManager.deleteFile(geminiFile.name);
    } catch (err) {
      console.error('Failed to delete file from Gemini:', err);
    }
  }
};
