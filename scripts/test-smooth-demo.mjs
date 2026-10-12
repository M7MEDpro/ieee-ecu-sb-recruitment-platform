/**
 * @file test-smooth-demo.mjs
 * @brief Automated test smooth demo script.
 * @author IEEE ECU Student Branch
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const videoDir = path.resolve('videos');

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

let currentStep = '01 · Modern Applicant Experience';

async function injectOverlay(p) {
  await p.evaluate((stepText) => {
    if (document.getElementById('screen-studio-cursor')) return;

    const style = document.createElement('style');
    style.id = 'ss-styles';
    style.textContent = `
      #screen-studio-cursor {
        position: fixed;
        top: 0;
        left: 0;
        width: 32px;
        height: 32px;
        pointer-events: none;
        z-index: 2147483647;
        transform: translate3d(-100px, -100px, 0);
        will-change: transform;
      }
      #screen-studio-ripple {
        position: absolute;
        top: 0px;
        left: 0px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: rgba(37, 99, 235, 0.45);
        border: 2px solid #60a5fa;
        transform: scale(0);
        opacity: 0;
        pointer-events: none;
      }
      .ripple-animate {
        animation: ss-ripple-anim 0.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
      }
      @keyframes ss-ripple-anim {
        0% { transform: scale(0.4); opacity: 1; }
        100% { transform: scale(3.2); opacity: 0; }
      }
      #demo-hud-badge {
        position: fixed;
        bottom: 28px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(10, 15, 29, 0.88);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05);
        color: #f8fafc;
        padding: 9px 20px;
        border-radius: 9999px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 2147483646;
        pointer-events: none;
        transition: all 0.3s ease;
      }
      #demo-hud-badge .pulse-dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: #10b981;
        box-shadow: 0 0 10px #10b981;
        animation: ss-pulse 2s infinite;
      }
      @keyframes ss-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.3; transform: scale(0.85); }
      }
      #demo-hud-badge .badge-title {
        color: #94a3b8;
        font-weight: 600;
        letter-spacing: 0.03em;
        font-size: 13px;
        text-transform: uppercase;
      }
      #demo-hud-badge .badge-divider {
        color: #475569;
      }
      #demo-hud-badge .badge-step {
        color: #38bdf8;
        font-weight: 600;
      }
    `;
    document.head.appendChild(style);

    const cursor = document.createElement('div');
    cursor.id = 'screen-studio-cursor';
    cursor.innerHTML = `
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.5));">
        <path d="M3 2L10 21L13.5 14.5L20 12L3 2Z" fill="#1d4ed8" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/>
      </svg>
      <div id="screen-studio-ripple"></div>
    `;
    document.body.appendChild(cursor);

    const badge = document.createElement('div');
    badge.id = 'demo-hud-badge';
    badge.innerHTML = `
      <span class="pulse-dot"></span>
      <span class="badge-title">IEEE ECU SB Platform</span>
      <span class="badge-divider">•</span>
      <span class="badge-step" id="demo-hud-text">${stepText}</span>
    `;
    document.body.appendChild(badge);

    window.__moveCursor = (x, y) => {
      const c = document.getElementById('screen-studio-cursor');
      if (c) c.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    window.__clickRipple = (x, y) => {
      const c = document.getElementById('screen-studio-cursor');
      if (c) c.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      const r = document.getElementById('screen-studio-ripple');
      if (r) {
        r.classList.remove('ripple-animate');
        void r.offsetWidth;
        r.classList.add('ripple-animate');
      }
    };
    window.__setHudStep = (txt) => {
      const el = document.getElementById('demo-hud-text');
      if (el) el.textContent = txt;
    };
  }, currentStep);
}

page.on('domcontentloaded', async () => {
  await injectOverlay(page).catch(() => {});
});

let curPos = { x: 960, y: 540 };

async function smoothMove(targetX, targetY, steps = 14) {
  const startX = curPos.x;
  const startY = curPos.y;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const curX = startX + (targetX - startX) * ease;
    const curY = startY + (targetY - startY) * ease;
    await page.evaluate(({ x, y }) => window.__moveCursor?.(x, y), { x: curX, y: curY }).catch(() => {});
    await page.waitForTimeout(16);
  }
  curPos = { x: targetX, y: targetY };
}

async function clickTarget(selector) {
  const el = await page.$(selector);
  if (!el) return;
  const box = await el.boundingBox();
  if (box) {
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await smoothMove(x, y);
    await page.waitForTimeout(80);
    await page.evaluate(({ x, y }) => window.__clickRipple?.(x, y), { x, y }).catch(() => {});
    await page.waitForTimeout(120);
  }
  await el.click();
}

console.log('Testing prototype navigation...');
await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await injectOverlay(page);
await page.waitForTimeout(1000);

await clickTarget('a[href="/apply"]');
await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
await injectOverlay(page);
await page.waitForTimeout(2000);

await page.close();
await context.close();
await browser.close();

console.log('Prototype test completed.');
