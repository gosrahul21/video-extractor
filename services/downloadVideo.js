import fs from 'fs';
import path from 'path';
import { create } from 'youtube-dl-exec';
import { fileURLToPath } from 'url';

const ytDlp = create('yt-dlp');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const downloadVideo = async (url, filePath) => {
  console.log(`[1/4] Downloading video from ${url}...`);
  const ytDlpOptions = {
    output: filePath,
    format: 'best[height<=720]/bestvideo[height<=720]+bestaudio/best',
    mergeOutputFormat: 'mp4'
  };

  const cookiesPath = path.join(__dirname, '../cookies.txt');
  if (fs.existsSync(cookiesPath)) {
    console.log('Using cookies.txt for authentication...');
    ytDlpOptions.cookies = cookiesPath;
  }

  // First fetch metadata to get the thumbnail
  let thumbnailUrl = null;
  try {
    const metaOptions = { dumpJson: true };
    if (fs.existsSync(cookiesPath)) metaOptions.cookies = cookiesPath;
    const metadata = await ytDlp(url, metaOptions);
    thumbnailUrl = metadata.thumbnail || null;
    console.log(`[1/4] Extracted thumbnail: ${thumbnailUrl}`);
  } catch (err) {
    console.error('Failed to extract metadata thumbnail:', err.message);
  }

  await ytDlp(url, ytDlpOptions);
  
  return thumbnailUrl;
};
