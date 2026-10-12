/**
 * @file capture-audit-logs.mjs
 * @brief Automated capture audit logs script.
 * @author IEEE ECU Student Branch
 */

import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = path.resolve('C:/Users/bdwym/.gemini/antigravity/brain/0a778c01-a3db-401d-8902-ccf145de8976');
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'screenshots');

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: false,
  defaultViewport: null,
  args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox'],
});

const [page] = await browser.pages();
await page.setViewport({ width: 1440, height: 900 });

// Login
await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });
await page.type('input[placeholder*="username"]', 'admin');
await page.type('input[type="password"]', process.env.ADMIN_PASSWORD || 'your_admin_password');
await page.click('button[type="submit"]');
await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
await new Promise(r => setTimeout(r, 1000));

// Audit logs
await page.goto('http://localhost:3001/admin/audit-logs', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1200));

// Click first table row to expand JSON payload diff
const firstRow = await page.$('table tbody tr');
if (firstRow) {
  await firstRow.evaluate(el => el.click());
  await new Promise(r => setTimeout(r, 600));
}

const filename = 'admin_deep_11_audit_logs_expanded_diff.png';
const subPath = path.join(SCREENSHOT_DIR, filename);
const rootPath = path.join(ARTIFACT_DIR, filename);
await page.screenshot({ path: subPath, fullPage: false });
fs.copyFileSync(subPath, rootPath);
console.log('✓ Captured expanded audit logs diff');
await browser.close();
