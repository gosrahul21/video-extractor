import { create } from 'youtube-dl-exec';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const ytDlp = create('yt-dlp');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TMP_DIR = path.join(__dirname, 'tmp');
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

async function testDownload(url) {
  console.log(`⏳ Starting download for: ${url}`);

  const filename = `test-${Date.now()}.mp4`;
  const filePath = path.join(TMP_DIR, filename);

  try {
    console.log('⬇️ Downloading video... (this might take a few seconds)');

    // Using the same format constraints as your main server
    await ytDlp(url, {
      output: filePath,
      format: 'best[height<=720]/bestvideo[height<=720]+bestaudio/best',
      mergeOutputFormat: 'mp4'
    });

    console.log('✅ Download Successful!');
    console.log(`📁 File saved at: ${filePath}`);
    console.log('Check the "tmp" folder in your project to see the video.');
  } catch (error) {
    console.error('❌ Download failed:');
    console.error(error.message);
  }
}

// Get the URL from the command line arguments
const targetUrl = process.argv[2];

if (!targetUrl) {
  console.log('⚠️ Please provide a URL to test. Example:');
  console.log('node test-download.js "https://www.youtube.com/shorts/XXXXX"');
} else {
  testDownload(targetUrl);
}
