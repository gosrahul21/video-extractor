import { GoogleAIFileManager } from '@google/generative-ai/server';
import dotenv from 'dotenv';
dotenv.config();

const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);

export const uploadToGemini = async (filePath, filename) => {
  console.log(`[2/4] Uploading video to Gemini...`);
  const uploadResult = await fileManager.uploadFile(filePath, {
    mimeType: 'video/mp4',
    displayName: filename,
  });
  const geminiFile = uploadResult.file;

  // Poll until file is active
  let fileState = await fileManager.getFile(geminiFile.name);
  while (fileState.state === 'PROCESSING') {
    console.log('Gemini processing video, waiting 3 seconds...');
    await new Promise((resolve) => setTimeout(resolve, 3000));
    fileState = await fileManager.getFile(geminiFile.name);
  }
  if (fileState.state === 'FAILED') {
    throw new Error('Video processing failed on Gemini side.');
  }

  return geminiFile;
};
