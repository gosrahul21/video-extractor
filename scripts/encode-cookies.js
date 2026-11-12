import { encodeCookiesFileToBase64 } from '../services/downloadVideo.js';

const inputPath = process.argv[2] || 'cookies.txt';

try {
  const encoded = encodeCookiesFileToBase64(inputPath);
  console.log(`YOUTUBE_COOKIES=${encoded}`);
} catch (err) {
  console.error(`Failed to encode cookies from "${inputPath}": ${err.message}`);
  process.exit(1);
}

