import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const systemInstruction = `You are an elite fitness AI assistant. Your job is to watch workout videos (like Instagram Reels or YouTube Shorts) and extract a highly structured workout plan from them.
You must watch the visual demonstration of the exercises AND listen to the audio/speech in the video.
Rules:
1. Extract every unique exercise shown.
2. For each exercise, identify the target muscle and the equipment used.
3. Extract the exact Sets and Reps mentioned. If not mentioned, infer them if possible, or return null.
4. Provide the exact timestamp (e.g., "00:15") where the exercise first appears in the video.
5. Provide a brief note if the creator mentions specific form cues.
6. Provide a short description of how the exercise is performed based on the video.

You MUST return the output EXACTLY in the following JSON schema:
{
  "workout_title": "String (Give the workout a catchy name)",
  "description": "String",
  "exercises": [
    {
      "name": "String",
      "description": "String",
      "primary_muscle": "String",
      "equipment": "String",
      "sets": Number,
      "reps": "String",
      "timestamp_start": "String (MM:SS)",
      "timestamp_end": "String (MM:SS)",
      "notes": "String"
    }
  ]
}`;

export const extractWorkoutWithGemini = async (geminiFile) => {
  console.log(`[3/4] Extracting workout with Gemini...`);
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

  return JSON.parse(result.response.text());
};
