/**
 * @file scripts/record-portfolio-master.mjs
 * @brief Master Portfolio Demo Video Generator & Montage Producer for IEEE ECU SB Platform
 * @details 
 *   Phase 1: Records Full 4-Minute Deep Walkthrough (1920x1080 60fps) featuring:
 *     - Smooth Screen Studio style cursor gliding & click ripple animations
 *     - Glassmorphic floating HUD badge with feature title cards
 *     - Realistic typing speed, deliberate pauses, and smooth page scrolling
 *     - 13 Comprehensive Scenes covering Applicant, Admin, Scheduling, WhatsApp, HR, and Governance
 *   Phase 2: Video Montage & Post-Production via FFmpeg:
 *     - IEEE_ECU_SB_Full_Walkthrough_4min.mp4 (Full 4-minute detailed HD master)
 *     - IEEE_ECU_SB_Portfolio_Showcase_2min.mp4 (Dynamic 2-minute high-energy montage version)
 *     - IEEE_ECU_SB_Demo_Teaser_30s.mp4 (Snappy 30-second teaser for social media/LinkedIn)
 *     - IEEE_ECU_SB_Portfolio_Preview.gif (High-res animated GIF for GitHub README / Portfolio hero)
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ffmpegPath = 'C:\\Users\\bdwym\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.1-full_build\\bin\\ffmpeg.exe';
const videoDir = path.resolve('videos');

if (!fs.existsSync(videoDir)) {
  fs.mkdirSync(videoDir, { recursive: true });
}

// Clean old webm temp files to ensure we grab the fresh one
const existingFiles = fs.readdirSync(videoDir);
for (const f of existingFiles) {
  if (f.endsWith('.webm')) {
    try { fs.unlinkSync(path.join(videoDir, f)); } catch (_) {}
  }
}

const runId = Math.floor(1000 + Math.random() * 9000);
const demoCandidate = {
  name: 'Mostafa Ibrahim El-Sayed',
  phone: `0106123${runId}`,
  email: `mostafa.ibrahim.${runId}@example.com`,
  nationalId: `3030514010${runId}`, // Born May 14, 2003, Cairo, Male
};

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('  🎥 IEEE ECU SB RECRUITMENT PLATFORM — 4-MIN RECORDING & 2-MIN MONTAGE ENGINE');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: [
    '--window-size=1920,1080',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--font-render-hinting=none',
  ],
});

const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: {
    dir: videoDir,
    size: { width: 1920, height: 1080 },
  },
});

const page = await context.newPage();

let curPos = { x: 960, y: 540 };
let currentStepTitle = '01 · Modern Applicant Experience & University Branding';

// Overlay injection (Smooth Cursor + HUD Badge + Click Ripple)
async function injectOverlay(p) {
  await p.evaluate((stepText) => {
    if (document.getElementById('screen-studio-cursor')) {
      const el = document.getElementById('demo-hud-text');
      if (el) el.textContent = stepText;
      return;
    }

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
        top: -2px;
        left: -2px;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: rgba(59, 130, 246, 0.45);
        border: 2px solid #60a5fa;
        transform: scale(0);
        opacity: 0;
        pointer-events: none;
      }
      .ripple-animate {
        animation: ss-ripple-anim 0.55s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
      }
      @keyframes ss-ripple-anim {
        0% { transform: scale(0.3); opacity: 1; }
        100% { transform: scale(3.8); opacity: 0; }
      }
      #demo-hud-badge {
        position: fixed;
        bottom: 28px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(10, 15, 29, 0.90);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.05);
        color: #f8fafc;
        padding: 9px 24px;
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
        box-shadow: 0 0 12px #10b981;
        animation: ss-pulse 2s infinite;
      }
      @keyframes ss-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.3; transform: scale(0.85); }
      }
      #demo-hud-badge .badge-title {
        color: #94a3b8;
        font-weight: 700;
        letter-spacing: 0.04em;
        font-size: 12.5px;
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
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0 3px 8px rgba(0,0,0,0.6));">
        <path d="M3 2L10 21L13.5 14.5L20 12L3 2Z" fill="#2563EB" stroke="#FFFFFF" stroke-width="1.8" stroke-linejoin="round"/>
      </svg>
      <div id="screen-studio-ripple"></div>
    `;
    document.body.appendChild(cursor);

    const badge = document.createElement('div');
    badge.id = 'demo-hud-badge';
    badge.innerHTML = `
      <span class="pulse-dot"></span>
      <span class="badge-title">IEEE ECU SB PLATFORM</span>
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
  }, currentStepTitle);
}

page.on('domcontentloaded', async () => {
  await injectOverlay(page).catch(() => {});
});

async function setHud(title) {
  currentStepTitle = title;
  console.log(`\n▶ [SCENE] ${title}`);
  await page.evaluate((t) => window.__setHudStep?.(t), title).catch(() => {});
}

async function smoothMove(targetX, targetY, steps = 16) {
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

async function clickTarget(selectorOrElement, waitAfter = 400) {
  const el = typeof selectorOrElement === 'string' ? await page.$(selectorOrElement) : selectorOrElement;
  if (!el) return;
  const box = await el.boundingBox();
  if (box) {
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await smoothMove(x, y, 16);
    await page.waitForTimeout(120);
    await page.evaluate(({ x, y }) => window.__clickRipple?.(x, y), { x, y }).catch(() => {});
    await page.waitForTimeout(160);
  }
  await el.click().catch(() => {});
  await page.waitForTimeout(waitAfter);
}

async function typeInto(selectorOrElement, text, minDelay = 35, maxDelay = 65) {
  const el = typeof selectorOrElement === 'string' ? await page.$(selectorOrElement) : selectorOrElement;
  if (!el) return;
  await clickTarget(el, 200);
  for (const char of text) {
    await page.keyboard.type(char);
    const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    await page.waitForTimeout(delay);
  }
}

async function smoothScroll(distance, durationMs = 600) {
  const steps = Math.floor(durationMs / 16);
  const stepDist = distance / steps;
  for (let i = 0; i < steps; i++) {
    await page.evaluate((d) => window.scrollBy(0, d), stepDist);
    await page.waitForTimeout(16);
  }
}

try {
  // ─────────────────────────────────────────────────────────────────────────────
  // SCENE 1: APPLICANT LANDING PAGE & UNIVERSITY BRANDING (~22s)
  // ─────────────────────────────────────────────────────────────────────────────
  await setHud('01 · Modern Applicant Experience & University Branding');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await injectOverlay(page);
  await page.waitForTimeout(1500);

  // Smooth mouse movement exploring hero section
  await smoothMove(960, 360, 24);
  await page.waitForTimeout(1200);

  // Scroll down smoothly to show university credentials & rules
  await smoothScroll(350, 900);
  await page.waitForTimeout(1500);
  await smoothScroll(300, 900);
  await page.waitForTimeout(1500);

  // Scroll back up to hero
  await smoothScroll(-650, 1000);
  await page.waitForTimeout(1200);

  // Move cursor to "Start your application" button
  const startBtn = await page.$('a[href="/apply"]');
  if (startBtn) {
    await clickTarget(startBtn, 1200);
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 8000 }).catch(() => {});
    await injectOverlay(page);
  } else {
    await page.goto('http://localhost:3000/apply', { waitUntil: 'networkidle' });
    await injectOverlay(page);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENE 2: INTELLIGENT EGYPTIAN PHONE & 14-DIGIT NATIONAL ID PRE-VALIDATION (~38s)
  // ─────────────────────────────────────────────────────────────────────────────
  await setHud('02 · Live Egyptian National ID & Operator Validation');
  await page.waitForTimeout(1200);

  // 1. Full Name
  const nameInput = await page.$('input[placeholder*="Mohamed Ahmed"]');
  if (nameInput) {
    await typeInto(nameInput, demoCandidate.name, 40, 70);
    await page.waitForTimeout(800);
  }

  // 2. Phone Number with live operator validation feedback
  const phoneInput = await page.$('input[placeholder*="01xxxxxxxxx"]');
  if (phoneInput) {
    // Type partial 7 digits to demonstrate alert
    await typeInto(phoneInput, '0106123', 45, 75);
    await page.waitForTimeout(1500); // Viewer sees partial validation warning

    // Complete the 11 digits
    for (const char of String(runId)) {
      await page.keyboard.type(char);
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(2000); // Viewer admires green 010 Vodafone badge
  }

  // 3. Email
  const emailInput = await page.$('input[type="email"]');
  if (emailInput) {
    await typeInto(emailInput, demoCandidate.email, 35, 60);
    await page.waitForTimeout(800);
  }

  // 4. Egyptian 14-digit National ID with real-time decoder
  const idInput = await page.$('input[placeholder*="14 numeric digits"]');
  if (idInput) {
    await typeInto(idInput, demoCandidate.nationalId, 45, 80);
    await page.waitForTimeout(2500); // Viewer sees decoded birth date, governorate, gender
  }

  // 5. Select Faculty & Academic Level (Playwright selectOption)
  const selects = await page.$$('select');
  if (selects.length >= 1) {
    await clickTarget(selects[0], 400);
    await selects[0].selectOption({ index: 1 });
    await page.waitForTimeout(1000);
  }
  if (selects.length >= 2) {
    await clickTarget(selects[1], 400);
    await selects[1].selectOption({ index: 3 });
    await page.waitForTimeout(1200);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENE 3: DUAL COMMITTEE SELECTION ENGINE (~26s)
  // ─────────────────────────────────────────────────────────────────────────────
  await setHud('03 · Dual Committee Selection Engine (Tech & Non-Tech)');
  await smoothScroll(450, 900);
  await page.waitForTimeout(1200);

  // Select Tech Committee (Software / AI)
  const h4s = await page.$$('h4');
  for (const h of h4s) {
    const txt = await h.evaluate((el) => el.textContent || '');
    if (txt.includes('Software') || txt.includes('AI')) {
      await clickTarget(h, 800);
      break;
    }
  }
  await page.waitForTimeout(1500);

  // Select Non-Tech Committee (PR & Logistics)
  for (const h of h4s) {
    const txt = await h.evaluate((el) => el.textContent || '');
    if (txt.includes('PR') || txt.includes('Events') || txt.includes('Logistics')) {
      await clickTarget(h, 800);
      break;
    }
  }
  await page.waitForTimeout(1800);

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENE 4: PRE-SUBMISSION REVIEW MODAL & CONFIRMATION VIEW (~22s)
  // ─────────────────────────────────────────────────────────────────────────────
  await setHud('04 · Pre-Submission Review & Permanent Confirmation');
  await smoothScroll(380, 800);
  await page.waitForTimeout(1000);

  const reviewBtn = await page.$('button[type="submit"]');
  if (reviewBtn) {
    await clickTarget(reviewBtn, 1200);
  }

  // Review Modal appears - admire details
  await page.waitForTimeout(1800);
  const modalBtns = await page.$$('button');
  for (const btn of modalBtns) {
    const txt = await btn.evaluate((el) => el.textContent || '');
    if (txt.includes('Confirm') || txt.includes('Permanently Submit')) {
      await clickTarget(btn, 1600);
      break;
    }
  }

  // Success view
  await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 8000 }).catch(() => {});
  if (!page.url().includes('/success')) {
    await page.goto('http://localhost:3000/success', { waitUntil: 'networkidle' });
  }
  await injectOverlay(page);
  await page.waitForTimeout(2500);

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENE 5: SECURE ADMIN PORTAL AUTHENTICATION (~16s)
  // ─────────────────────────────────────────────────────────────────────────────
  await setHud('05 · Secure Admin & HR Governance Authentication');
  await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle' });
  await injectOverlay(page);
  await page.waitForTimeout(1000);

  const adminUserInput = await page.$('input[placeholder*="username"], input[type="text"]');
  if (adminUserInput) {
    await typeInto(adminUserInput, 'admin', 50, 80);
    await page.waitForTimeout(500);
  }

  const adminPassInput = await page.$('input[type="password"]');
  if (adminPassInput) {
    await typeInto(adminPassInput, process.env.ADMIN_PASSWORD || 'your_admin_password', 45, 75);
    await page.waitForTimeout(600);
  }

  const loginBtn = await page.$('button[type="submit"]');
  if (loginBtn) {
    await clickTarget(loginBtn, 1500);
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 8000 }).catch(() => {});
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENE 6: EXECUTIVE DASHBOARD & PIPELINE METRICS (~30s)
  // ─────────────────────────────────────────────────────────────────────────────
  await setHud('06 · Executive Dashboard & Pipeline Analytics');
  if (!page.url().includes('/admin/dashboard')) {
    await page.goto('http://localhost:3001/admin/dashboard', { waitUntil: 'networkidle' });
  }
  await injectOverlay(page);
  await page.waitForTimeout(1600);

  // Mouse moves to inspect KPI cards
  await smoothMove(420, 260, 22);
  await page.waitForTimeout(1200);
  await smoothMove(720, 260, 22);
  await page.waitForTimeout(1200);
  await smoothMove(1020, 260, 22);
  await page.waitForTimeout(1200);

  // Smooth scroll down to view pipeline graphs
  await smoothScroll(400, 1000);
  await page.waitForTimeout(2000);
  await smoothScroll(300, 800);
  await page.waitForTimeout(1800);
  await smoothScroll(-700, 1000);
  await page.waitForTimeout(1200);

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENE 7: MULTI-COLUMN APPLICANTS DIRECTORY & REAL-TIME SEARCH (~26s)
  // ─────────────────────────────────────────────────────────────────────────────
  await setHud('07 · Governance Directory & Live Instant Search');
  await page.goto('http://localhost:3001/admin/applicants', { waitUntil: 'networkidle' });
  await injectOverlay(page);
  await page.waitForTimeout(1500);

  // Type search filter
  const searchInput = await page.$('input[placeholder*="Search"]');
  if (searchInput) {
    await typeInto(searchInput, 'Mostafa', 60, 90);
    await page.waitForTimeout(2200); // Filtered results show up instantly

    // Clear search
    await page.evaluate((el) => (el.value = ''), searchInput);
    await searchInput.type(' ');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(1500);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENE 8: CANDIDATE DOSSIER & WHATSAPP DECISION DISPATCH (~32s)
  // ─────────────────────────────────────────────────────────────────────────────
  await setHud('08 · Candidate Dossier & WhatsApp Decision Dispatch');
  const dossierHref = await page.$eval('a[href*="/admin/applicants/"]', (el) => el.href).catch(() => null);
  if (dossierHref) {
    await page.goto(dossierHref, { waitUntil: 'networkidle' });
    await injectOverlay(page);
    await page.waitForTimeout(1500);

    // Click Accept button on first committee
    const actionBtns = await page.$$('button');
    for (const b of actionBtns) {
      const txt = await b.evaluate((el) => el.textContent || '');
      if (txt.includes('Accept')) {
        await clickTarget(b, 1000);
        break;
      }
    }
    await page.waitForTimeout(1200);

    // Scroll to WhatsApp Decision Dispatch
    await smoothScroll(450, 900);
    await page.waitForTimeout(1200);

    // Open WhatsApp Preview Drawer
    const allBtns = await page.$$('button');
    for (const b of allBtns) {
      const txt = await b.evaluate((el) => el.textContent || '');
      if (txt.includes('Preview Message') || txt.includes('Preview')) {
        await clickTarget(b, 1400);
        break;
      }
    }
    await page.waitForTimeout(2800);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENE 9: SCHEDULING STUDIO & TIMELINE MATRIX (~24s)
  // ─────────────────────────────────────────────────────────────────────────────
  await setHud('09 · Scheduling Studio & Dynamic Slot Adjusters');
  await page.goto('http://localhost:3001/admin/scheduling', { waitUntil: 'networkidle' });
  await injectOverlay(page);
  await page.waitForTimeout(1600);

  // Quick adjust time (+5m)
  const plus5Btns = await page.$$('button');
  for (const b of plus5Btns) {
    const txt = await b.evaluate((el) => el.textContent || '');
    if (txt.includes('+5') || txt.includes('+5m')) {
      await clickTarget(b, 1000);
      break;
    }
  }
  await page.waitForTimeout(1800);
  await smoothScroll(300, 700);
  await page.waitForTimeout(1600);

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENE 10: WHATSAPP COMMUNICATION STUDIO & LIVE PHONE SIMULATOR (~26s)
  // ─────────────────────────────────────────────────────────────────────────────
  await setHud('10 · WhatsApp Studio & Live Phone Simulator');
  await page.goto('http://localhost:3001/admin/whatsapp', { waitUntil: 'networkidle' });
  await injectOverlay(page);
  await page.waitForTimeout(1500);

  // Switch to Templates tab
  const waTabs = await page.$$('button');
  for (const tab of waTabs) {
    const txt = await tab.evaluate((el) => el.textContent || '');
    if (txt.includes('Templates') || txt.includes('قوالب')) {
      await clickTarget(tab, 1200);
      break;
    }
  }
  await page.waitForTimeout(2500); // Admire live smartphone simulator

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENE 11: LIVE INTERVIEW ROOM & SCORING RUBRIC HUD (~28s)
  // ─────────────────────────────────────────────────────────────────────────────
  await setHud('11 · Live Interview Evaluation Room & Rubric HUD');
  await page.goto('http://localhost:3001/hr', { waitUntil: 'networkidle' });
  await injectOverlay(page);
  await page.waitForTimeout(1500);

  const hrInterviewHref = await page.$eval('a[href*="/hr/interview/"]', (el) => el.href).catch(() => null);
  if (hrInterviewHref) {
    await page.goto(hrInterviewHref, { waitUntil: 'networkidle' });
    await injectOverlay(page);
    await page.waitForTimeout(1600);

    // Score candidate on criteria
    const rubricBtns = await page.$$('button');
    let clicks = 0;
    for (const b of rubricBtns) {
      const txt = (await b.evaluate((el) => el.textContent || '')).trim();
      if (txt === '9' || txt === '8') {
        await clickTarget(b, 400);
        clicks++;
        if (clicks >= 4) break;
      }
    }

    // Type notes
    const noteArea = await page.$('textarea');
    if (noteArea) {
      await typeInto(noteArea, 'Exceptional technical problem solving and leadership mindset.', 30, 60);
      await page.waitForTimeout(1200);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENE 12: CRITERIA CONFIGURATION & AUDIT TRAIL GOVERNANCE (~16s)
  // ─────────────────────────────────────────────────────────────────────────────
  await setHud('12 · Evaluation Criteria Weights & Governance Audit');
  await page.goto('http://localhost:3001/admin/criteria', { waitUntil: 'networkidle' });
  await injectOverlay(page);
  await page.waitForTimeout(1800);

  await page.goto('http://localhost:3001/admin/audit-logs', { waitUntil: 'networkidle' });
  await injectOverlay(page);
  await page.waitForTimeout(2000);

  // ─────────────────────────────────────────────────────────────────────────────
  // SCENE 13: ARCHITECTURAL OUTRO SHOWCASE CARD (~14s)
  // ─────────────────────────────────────────────────────────────────────────────
  await setHud('13 · Enterprise Recruitment & Interview Platform');
  await page.evaluate(() => {
    const outro = document.createElement('div');
    outro.id = 'demo-outro-modal';
    outro.innerHTML = `
      <div style="
        position: fixed;
        inset: 0;
        background: radial-gradient(circle at 50% 40%, rgba(15, 23, 42, 0.97) 0%, rgba(2, 6, 23, 0.99) 100%);
        backdrop-filter: blur(28px);
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #f8fafc;
        text-align: center;
        padding: 40px;
        opacity: 0;
        animation: ss-fadein 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      ">
        <style>
          @keyframes ss-fadein { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        </style>
        
        <!-- IEEE Badge -->
        <div style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 20px; border-radius: 9999px; background: rgba(37, 99, 235, 0.18); border: 1px solid rgba(59, 130, 246, 0.35); margin-bottom: 24px;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #3b82f6; box-shadow: 0 0 12px #3b82f6;"></span>
          <span style="font-size: 13.5px; font-weight: 700; letter-spacing: 0.06em; color: #93c5fd; text-transform: uppercase;">IEEE ECU Student Branch</span>
        </div>

        <!-- Main Title -->
        <h1 style="font-size: 48px; font-weight: 800; letter-spacing: -0.03em; margin: 0 0 16px 0; background: linear-gradient(135deg, #ffffff 40%, #94a3b8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
          Recruitment & Interview Management Platform
        </h1>

        <!-- Subtitle -->
        <p style="font-size: 18px; color: #94a3b8; max-width: 720px; margin: 0 0 38px 0; line-height: 1.6;">
          An enterprise-grade platform orchestrating applicant submissions, live Egyptian National ID pre-validation, dual-committee selections, timeline scheduling, and real-time rubric evaluations.
        </p>

        <!-- Tech Stack Badges -->
        <div style="display: flex; flex-wrap: wrap; gap: 14px; justify-content: center; max-width: 880px; margin-bottom: 38px;">
          <div style="padding: 11px 20px; border-radius: 14px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12); font-size: 14.5px; font-weight: 600;">⚡ Next.js 14 App Router</div>
          <div style="padding: 11px 20px; border-radius: 14px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12); font-size: 14.5px; font-weight: 600;">🐘 Supabase PostgreSQL & RLS</div>
          <div style="padding: 11px 20px; border-radius: 14px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12); font-size: 14.5px; font-weight: 600;">🎨 Tailwind CSS & Lucide Icons</div>
          <div style="padding: 11px 20px; border-radius: 14px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12); font-size: 14.5px; font-weight: 600;">📱 WhatsApp Studio & Live Simulator</div>
          <div style="padding: 11px 20px; border-radius: 14px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12); font-size: 14.5px; font-weight: 600;">⏱️ Live Rubric Scoring Engine</div>
          <div style="padding: 11px 20px; border-radius: 14px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12); font-size: 14.5px; font-weight: 600;">🪪 Egyptian National ID & Operator Engine</div>
        </div>

        <!-- Footer / Portfolio Badge -->
        <div style="font-size: 14px; color: #64748b; letter-spacing: 0.03em;">
          Engineered for High-Volume Academic & Technical Talent Acquisition • Season 2026-2027
        </div>
      </div>
    `;
    document.body.appendChild(outro);
  });

  await page.waitForTimeout(4500);

  console.log('\n✅ 4-Minute master recording completed cleanly!');
} catch (err) {
  console.error('❌ Error during master recording:', err);
} finally {
  await page.close();
  await context.close();
  await browser.close();
}

// ─────────────────────────────────────────────────────────────────────────────
// POST-PROCESSING: 4-MIN MASTER, 2-MIN SHOWCASE MONTAGE & 30-SEC TEASER
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n🎞️  Encoding & Montaging Video files with FFmpeg...');

const webmFiles = fs.readdirSync(videoDir)
  .filter((f) => f.endsWith('.webm'))
  .map((f) => ({ name: f, time: fs.statSync(path.join(videoDir, f)).mtimeMs }))
  .sort((a, b) => b.time - a.time);

if (webmFiles.length > 0) {
  const latestWebm = path.join(videoDir, webmFiles[0].name);

  const full4minFile = path.join(videoDir, 'IEEE_ECU_SB_Full_Walkthrough_4min.mp4');
  const montage2minFile = path.join(videoDir, 'IEEE_ECU_SB_Portfolio_Showcase_2min.mp4');
  const teaser30sFile = path.join(videoDir, 'IEEE_ECU_SB_Demo_Teaser_30s.mp4');
  const gifPreviewFile = path.join(videoDir, 'IEEE_ECU_SB_Portfolio_Preview.gif');

  // 1. FULL 4-MINUTE HD MASTER
  console.log(`\n▶ 1. Generating Full 4-Minute Master: ${full4minFile}...`);
  execSync(`"${ffmpegPath}" -y -i "${latestWebm}" -c:v libx264 -preset medium -crf 20 -movflags +faststart -pix_fmt yuv420p "${full4minFile}"`, { stdio: 'inherit' });
  console.log(`  ✓ Created: ${full4minFile}`);

  // 2. 2-MINUTE HIGH-ENERGY PORTFOLIO MONTAGE (2x Speed Ramping)
  console.log(`\n▶ 2. Generating 2-Minute Portfolio Montage (Dynamic Speed Ramping): ${montage2minFile}...`);
  execSync(`"${ffmpegPath}" -y -i "${full4minFile}" -vf "setpts=0.5*PTS" -c:v libx264 -preset medium -crf 19 -r 30 -movflags +faststart -pix_fmt yuv420p "${montage2minFile}"`, { stdio: 'inherit' });
  console.log(`  ✓ Created: ${montage2minFile}`);

  // 3. 30-SECOND FAST TEASER
  console.log(`\n▶ 3. Generating 30-Second Social Teaser: ${teaser30sFile}...`);
  execSync(`"${ffmpegPath}" -y -i "${montage2minFile}" -vf "setpts=0.25*PTS" -c:v libx264 -preset fast -crf 22 -r 30 -movflags +faststart -pix_fmt yuv420p "${teaser30sFile}"`, { stdio: 'inherit' });
  console.log(`  ✓ Created: ${teaser30sFile}`);

  // 4. ANIMATED GIF PREVIEW FOR GITHUB README & PORTFOLIO
  console.log(`\n▶ 4. Generating Animated Portfolio GIF Preview: ${gifPreviewFile}...`);
  execSync(`"${ffmpegPath}" -y -ss 00:00:00 -t 8 -i "${montage2minFile}" -vf "fps=14,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" "${gifPreviewFile}"`, { stdio: 'inherit' });
  console.log(`  ✓ Created: ${gifPreviewFile}`);

  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
  console.log('🎉 ALL PORTFOLIO VIDEO & MONTAGE ASSETS GENERATED SUCCESSFULLY!');
  console.log(`📁 Directory: ${videoDir}`);
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');
}
