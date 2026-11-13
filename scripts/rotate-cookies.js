import fs from 'fs';
import path from 'path';
import { configService } from '../services/configService.js';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Rotate YouTube Cookies in Supabase app_config
 * @param {string} cookiesContentOrPath - Raw Netscape string, base64 string, or path to a cookies.txt file
 */
export const rotateCookies = async (cookiesContentOrPath) => {
  let content = cookiesContentOrPath;

  if (fs.existsSync(cookiesContentOrPath)) {
    console.log(`Reading cookies from file: ${cookiesContentOrPath}`);
    content = fs.readFileSync(path.resolve(cookiesContentOrPath), 'utf-8');
  }

  content = (content || '').trim();
  if (!content) {
    throw new Error('Cookies content is empty.');
  }

  console.log(`Saving cookies to Supabase freakyfit.app_config... (length: ${content.length} characters)`);
  await configService.set('youtube_cookies', content);
  console.log('✅ YouTube cookies successfully rotated in Supabase!');
};

// If run directly from terminal: `node scripts/rotate-cookies.js <path-or-content>`
const input = process.argv[2] || process.env.COOKIES_FILE || './cookies.txt';
if (process.argv[1]?.endsWith('rotate-cookies.js')) {
  if (!input) {
    console.error('Usage: node scripts/rotate-cookies.js <path-to-cookies.txt>');
    process.exit(1);
  }

  rotateCookies(input)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Failed to rotate cookies:', err.message);
      process.exit(1);
    });
}

