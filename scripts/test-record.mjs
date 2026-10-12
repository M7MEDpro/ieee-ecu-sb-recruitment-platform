/**
 * @file test-record.mjs
 * @brief Automated test record script.
 * @author IEEE ECU Student Branch
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const videoDir = path.resolve('videos');

if (!fs.existsSync(videoDir)) {
  fs.mkdirSync(videoDir, { recursive: true });
}

console.log('Testing video recording setup...');

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ['--window-size=1920,1080', '--no-sandbox'],
});

const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: {
    dir: videoDir,
    size: { width: 1920, height: 1080 },
  },
});

const page = await context.newPage();
await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

// Inject overlay
await page.evaluate(() => {
  const badge = document.createElement('div');
  badge.style.cssText = 'position:fixed; top:20px; left:20px; background:red; color:white; padding:10px; font-size:20px; z-index:999999;';
  badge.textContent = 'RECORDER TEST OK';
  document.body.appendChild(badge);
});

await page.waitForTimeout(2000);

await page.close();
await context.close();
await browser.close();

console.log('Video recording finished successfully!');
