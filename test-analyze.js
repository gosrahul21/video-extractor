import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';

dotenv.config();

// Ensure GEMINI_API_KEY is available
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ Error: GEMINI_API_KEY is missing in your .env file.');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);

const systemInstruction = `You are an elite fitness AI assistant. Your job is to watch workout videos (like Instagram Reels or YouTube Shorts) and extract a highly structured workout plan from them.
You must watch the visual demonstration of the exercises AND listen to the audio/speech in the video.
Rules:
1. Extract every unique exercise shown.
2. For each exercise, identify the target muscle and the equipment used.
3. Extract the exact Sets and Reps mentioned. If not mentioned, infer them if possible, or return null.
4. Provide the exact timestamp (e.g., "00:15") where the exercise first appears in the video.
5. Provide a brief note if the creator mentions specific form cues.

You MUST return the output EXACTLY in the following JSON schema:
{
  "workout_title": "String (Give the workout a catchy name)",
  "description": "String",
  "exercises": [
    {
      "name": "String",
      "primary_muscle": "String",
      "equipment": "String",
      "sets": Number,
      "reps": "String",
      "timestamp_start": "String (MM:SS)",
      "notes": "String"
    }
  ]
}`;

async function testAnalyze(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: File not found at path: ${filePath}`);
    return;
  }

  let geminiFile = null;

  try {
    console.log(`[1/3] Uploading video to Gemini...`);
    const uploadResult = await fileManager.uploadFile(filePath, {
      mimeType: 'video/mp4',
      displayName: path.basename(filePath),
    });
    geminiFile = uploadResult.file;
    console.log(`✅ Uploaded as: ${geminiFile.name}`);

    console.log(`[2/3] Waiting for Gemini to process the video...`);
    let fileState = await fileManager.getFile(geminiFile.name);
    while (fileState.state === 'PROCESSING') {
      process.stdout.write('.');
      await new Promise((resolve) => setTimeout(resolve, 3000));
      fileState = await fileManager.getFile(geminiFile.name);
    }
    console.log(); // new line

    if (fileState.state === 'FAILED') {
      throw new Error('Video processing failed on Gemini side.');
    }
    console.log(`✅ Video is ready for analysis.`);

    console.log(`[3/3] Extracting workout using AI...`);
    const model = genAI.getGenerativeModel({ 
        model: 'gemini-3.5-flash-lite',
        systemInstruction: systemInstruction,
        generationConfig: {
            responseMimeType: 'application/json'
        }
    });

    const result = await model.generateContent([
      {
        fileData: {
          mimeType: geminiFile.mimeType,
          fileUri: geminiFile.uri
        }
      },
      "Analyze this video and extract the workout according to the rules."
    ]);

    console.log('✅ Analysis Complete! Here is the JSON output:\n');
    const workoutData = result.response.text();
    console.log(JSON.stringify(JSON.parse(workoutData), null, 2));

  } catch (error) {
    console.error('\n❌ Analysis failed:');
    console.error(error.message);
  } finally {
    if (geminiFile) {
      try {
        console.log(`\n🧹 Cleaning up: Deleting file from Gemini...`);
        await fileManager.deleteFile(geminiFile.name);
        console.log(`✅ Cleaned up successfully.`);
      } catch (err) {
        console.error('Failed to delete file from Gemini:', err);
      }
    }
  }
}

// Get the file path from the command line arguments
const targetFilePath = process.argv[2];

if (!targetFilePath) {
  console.log('⚠️ Please provide a path to an MP4 file. Example:');
  console.log('node test-analyze.js "./tmp/test-123456789.mp4"');
} else {
  testAnalyze(targetFilePath);
}
