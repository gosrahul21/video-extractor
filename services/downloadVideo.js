import fs from 'fs';
import path from 'path';
import { create } from 'youtube-dl-exec';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';
dotenv.config();

const ytDlp = create('yt-dlp');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Encode a Netscape-format cookies string into a single-line base64 string
 * suitable for the YOUTUBE_COOKIES environment variable.
 */
export const encodeCookiesToBase64 = (cookiesText) => {
  const normalized = cookiesText.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    throw new Error('Cookies content is empty');
  }
  return Buffer.from(normalized, 'utf-8').toString('base64');
};

/**
 * Read a Netscape cookies file (default: ./cookies.txt) and encode it
 * into a single-line base64 string for YOUTUBE_COOKIES.
 */
export const encodeCookiesFileToBase64 = (
  cookiesFilePath = path.join(__dirname, '../cookies.txt')
) => {
  const resolvedPath = path.resolve(cookiesFilePath);
  const content = fs.readFileSync(resolvedPath, 'utf-8');
  return encodeCookiesToBase64(content);
};

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

  const baseOptions = {
    jsRuntimes: 'node',
    remoteComponents: 'ejs:github'
  };

  if (effectiveCookiesPath) {
    console.log('Using cookies for YouTube authentication...');
  }

  const attempts = [
    {
      label: effectiveCookiesPath ? 'default clients + cookies' : 'default clients',
      options: {
        ...baseOptions,
        ...(effectiveCookiesPath ? { cookies: effectiveCookiesPath } : {})
      }
    },
    {
      label: effectiveCookiesPath ? 'tv,web_embedded + cookies' : 'tv,web_embedded',
      options: {
        ...baseOptions,
        extractorArgs: 'youtube:player_client=tv,web_embedded',
        ...(effectiveCookiesPath ? { cookies: effectiveCookiesPath } : {})
      }
    },
    ...(effectiveCookiesPath
      ? [
          {
            label: 'default clients (no cookies)',
            options: { ...baseOptions }
          }
        ]
      : [])
  ];

  // 2. Fetch metadata to extract thumbnail (and find a working client config)
  let thumbnailUrl = null;
  let preferredAttempts = attempts;
  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    try {
      const metadata = await ytDlp(url, {
        dumpJson: true,
        ...attempt.options
      });
      thumbnailUrl = metadata.thumbnail || null;
      console.log(`[1/4] Extracted thumbnail (${attempt.label}): ${thumbnailUrl}`);
      // Try the winning config first for the actual download
      preferredAttempts = [attempt, ...attempts.filter((_, idx) => idx !== i)];
      break;
    } catch (err) {
      console.error(`Failed to extract metadata thumbnail (${attempt.label}):`, err.message);
    }
  }

  // 3. Download the video with fallback across client/cookie configs
  let lastError = null;
  for (const attempt of preferredAttempts) {
    try {
      await ytDlp(url, {
        output: filePath,
        format: 'best[height<=720]/bestvideo[height<=720]+bestaudio/best',
        mergeOutputFormat: 'mp4',
        ...attempt.options
      });
      return thumbnailUrl;
    } catch (err) {
      lastError = err;
      console.error(`[1/4] Download failed (${attempt.label}):`, err.message);
    }
  }

  throw lastError;
};

