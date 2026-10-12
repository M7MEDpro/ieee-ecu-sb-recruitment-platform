/**
 * @file test-ui-errors.mjs
 * @brief Automated test ui errors script.
 * @author IEEE ECU Student Branch
 */

import puppeteer from 'puppeteer-core';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: ['--no-sandbox']
});

const page = await browser.newPage();
const logs = [];

page.on('console', msg => {
  logs.push({ type: msg.type(), text: msg.text() });
});
page.on('pageerror', err => logs.push({ type: 'pageerror', text: err.message }));

// 1. Check applicant landing page
console.log('--- Checking Applicant Landing UI (localhost:3000) ---');
await page.goto('http://localhost:3000');
await new Promise(r => setTimeout(r, 1500));

// 2. Check applicant apply page
console.log('--- Checking Applicant Apply Form UI (localhost:3000/apply) ---');
await page.goto('http://localhost:3000/apply');
await new Promise(r => setTimeout(r, 1500));

// 3. Check Admin Login
console.log('--- Checking Admin Login UI (localhost:3001/login) ---');
await page.goto('http://localhost:3001/login');
await new Promise(r => setTimeout(r, 1000));
await page.type('input[placeholder*="username"]', 'admin');
await page.type('input[type="password"]', process.env.ADMIN_PASSWORD || 'your_admin_password');
await page.click('button[type="submit"]');
await new Promise(r => setTimeout(r, 2000));

// 4. Check Admin Dashboard
console.log('--- Checking Admin Dashboard UI (localhost:3001/admin/dashboard) ---');
await page.goto('http://localhost:3001/admin/dashboard');
await new Promise(r => setTimeout(r, 1500));

// 5. Check Admin Applicants Directory
console.log('--- Checking Admin Applicants UI (localhost:3001/admin/applicants) ---');
await page.goto('http://localhost:3001/admin/applicants');
await new Promise(r => setTimeout(r, 1500));

// 6. Check Admin Scheduling
console.log('--- Checking Admin Scheduling UI (localhost:3001/admin/scheduling) ---');
await page.goto('http://localhost:3001/admin/scheduling');
await new Promise(r => setTimeout(r, 1500));

// 7. Check Admin WhatsApp Studio
console.log('--- Checking Admin WhatsApp Studio UI (localhost:3001/admin/whatsapp) ---');
await page.goto('http://localhost:3001/admin/whatsapp');
await new Promise(r => setTimeout(r, 1500));

console.log('\n=== ALL BROWSER ERRORS AND WARNINGS ===');
const errorLogs = logs.filter(l => l.type === 'error' || l.type === 'pageerror');
if (errorLogs.length === 0) {
  console.log('✨ Zero console errors detected across all pages!');
} else {
  errorLogs.forEach(l => console.log(`[${l.type}] ${l.text}`));
}

await browser.close();
