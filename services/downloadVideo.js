import fs from 'fs';
import path from 'path';
import { create } from 'youtube-dl-exec';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';
dotenv.config();

const ytDlp = create('yt-dlp');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const downloadVideo = async (url, filePath) => {
  console.log(`[1/4] Downloading video from ${url}...`);

  // 1. Resolve cookies strictly from environment variable (YOUTUBE_COOKIES)
  let effectiveCookiesPath = null;
  if (process.env.YOUTUBE_COOKIES) {
    const tmpDir = path.join(__dirname, '../tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    const envCookiesPath = path.join(tmpDir, 'env_cookies.txt');
    try {
      const rawCookies = process.env.YOUTUBE_COOKIES.trim();
      const content = (rawCookies.startsWith('# Netscape') || rawCookies.includes('\t'))
        ? rawCookies
        : Buffer.from(rawCookies, 'base64').toString('utf-8');
      fs.writeFileSync(envCookiesPath, content, 'utf-8');
      effectiveCookiesPath = envCookiesPath;
    } catch (e) {
      console.error('Failed to parse YOUTUBE_COOKIES env var:', e.message);
    }
  }

  const baseOptions = {};

  if (effectiveCookiesPath) {
    console.log('Using cookies for YouTube authentication...');
    baseOptions.cookies = effectiveCookiesPath;
  } else {
    // When unauthenticated, android client helps bypass the web bot-guard challenge
    baseOptions.extractorArgs = 'youtube:player_client=android,web';
  }


  // 2. Fetch metadata to extract thumbnail
  let thumbnailUrl = null;
  try {
    const metadata = await ytDlp(url, {
      dumpJson: true,
      ...baseOptions
    });
    thumbnailUrl = metadata.thumbnail || null;
    console.log(`[1/4] Extracted thumbnail: ${thumbnailUrl}`);
  } catch (err) {
    console.error('Failed to extract metadata thumbnail:', err.message);
  }

  // 3. Download the video
  await ytDlp(url, {
    output: filePath,
    format: 'best[height<=720]/bestvideo[height<=720]+bestaudio/best',
    mergeOutputFormat: 'mp4',
    ...baseOptions
  });

  return thumbnailUrl;
};

