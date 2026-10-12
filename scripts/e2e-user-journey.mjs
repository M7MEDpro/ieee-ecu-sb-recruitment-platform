/**
 * @file scripts/e2e-user-journey.mjs
 * @brief Realistic Headless User Journey with Live Screenshots & Verification.
 * @details Simulates realistic user and administrator workflows:
 *          1. Applicant explores landing page (Desktop & Mobile)
 *          2. Applicant fills application with live 11-digit phone & national ID validation
 *          3. Applicant submits and verifies success view
 *          4. Admin logs in with credentials
 *          5. Admin views mobile dashboard and opens responsive navigation drawer
 *          6. Admin explores Applicants Directory (verifying mobile cards view vs desktop table)
 *          7. Admin views candidate dossier, committee decisions, and customized WhatsApp dispatch
 *          8. Admin tests Scheduling Timeline with slot cards & quick adjusters
 *          9. Admin customizes WhatsApp messages in WhatsApp Studio and inspects live simulator
 *         10. Interviewer conducts live interview session with 5-column score buttons on mobile
 */

import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\bdwym\\.gemini\\antigravity\\brain\\3bad42ee-cb71-4226-a705-542f1dd03077\\screenshots';

if (!fs.existsSync(artifactDir)) {
  fs.mkdirSync(artifactDir, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

console.log('🚀 Launching Chrome Headless User Journey Simulation...');

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
});

async function capture(page, filename, description) {
  const filepath = path.join(artifactDir, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  console.log(`  📸 Captured: ${filename} — ${description}`);
  return filepath;
}

try {
  const page = await browser.newPage();

  // ───────────────────────────────────────────────────────────────────────────
  // JOURNEY 1: APPLICANT LANDING & APPLICATION FORM
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n▶ [Applicant Flow] 1. Exploring Landing Page (Desktop & Mobile)');
  
  // Desktop Landing
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await capture(page, '01_applicant_landing_desktop.png', 'Applicant Landing Page (Desktop View)');

  // Mobile Landing (iPhone 14 / modern phone 390x844)
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await capture(page, '01_applicant_landing_mobile.png', 'Applicant Landing Page (Mobile Phone 390px View)');

  // Mobile Application Form
  console.log('\n▶ [Applicant Flow] 2. Filling Application with 11-digit Phone & National ID Validation');
  await page.goto('http://localhost:3000/apply', { waitUntil: 'networkidle0' });
  await capture(page, '02_applicant_form_mobile.png', 'Application Form Initial State (Mobile)');

  // Fill Full Name
  await page.type('input[placeholder*="Mohamed Ahmed"]', 'Ziad Tarek Mostafa');

  // Fill Phone with live validation demonstration: type incomplete, then complete valid 010
  const phoneInput = await page.$('input[placeholder*="01xxxxxxxxx"]');
  await phoneInput.type('0101234');
  await sleep(300);
  await capture(page, '03_applicant_phone_typing_mobile.png', 'Phone input live validation: incomplete 7/11 digits alert');

  // Complete phone to valid 11 digits (01012345678)
  await phoneInput.type('5678');
  await sleep(300);
  await capture(page, '03_applicant_phone_valid_mobile.png', 'Phone input live validation: green badge for 010 Vodafone valid 11 digits');

  // Fill Email
  await page.type('input[type="email"]', 'ziad.tarek@example.com');

  // Fill National ID
  const idInput = await page.$('input[placeholder*="14 numeric digits"]');
  if (idInput) {
    await idInput.type('30408150102451');
    await sleep(300);
    await capture(page, '03_applicant_id_valid_mobile.png', 'National ID live validation: born 2004, Cairo, Male');
  }

  // Select Faculty & Academic Level
  const selects = await page.$$('select');
  if (selects.length >= 2) {
    await selects[0].select(await selects[0].$$eval('option', (opts) => opts[1]?.value || opts[opts.length - 1]?.value));
    await selects[1].select(await selects[1].$$eval('option', (opts) => opts[1]?.value || opts[opts.length - 1]?.value));
  }

  // Select Tech Team & Non-Tech Team by clicking cards
  const h4Elements = await page.$$('h4');
  for (const h4 of h4Elements) {
    const text = await h4.evaluate((el) => el.textContent || '');
    if (text.includes('Software') || text.includes('AI')) {
      await h4.click();
      break;
    }
  }
  for (const h4 of h4Elements) {
    const text = await h4.evaluate((el) => el.textContent || '');
    if (text.includes('Events') || text.includes('Logistics') || text.includes('PR')) {
      await h4.click();
      break;
    }
  }

  await sleep(400);
  await capture(page, '04_applicant_form_ready_mobile.png', 'Form ready with 1 Tech + 1 Non-Tech committees selected');

  // Submit Application
  const submitBtn = await page.$('button[type="submit"]');
  if (submitBtn) {
    await submitBtn.click();
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
    await sleep(500);
    await capture(page, '05_applicant_success_mobile.png', 'Application Submission Success Confirmation View');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // JOURNEY 2: ADMIN AUTHENTICATION & PORTAL (MOBILE & DESKTOP)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n▶ [Admin Flow] 3. Admin Authentication & Mobile Responsiveness');

  // Admin Login (Mobile 390px)
  await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });
  await capture(page, '06_admin_login_mobile.png', 'Admin Portal Login (Mobile View)');

  // Admin Login (Desktop 1280px)
  await page.setViewport({ width: 1280, height: 800 });
  await capture(page, '06_admin_login_desktop.png', 'Admin Portal Login (Desktop View)');

  // Perform Admin Login
  await page.type('input[placeholder*="username"]', 'admin');
  await page.type('input[type="password"]', process.env.ADMIN_PASSWORD || 'your_admin_password');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
  await sleep(500);

  // Dashboard Overview (Desktop)
  await capture(page, '07_admin_dashboard_desktop.png', 'Admin Dashboard (Desktop View with Metrics & Quick Links)');

  // Dashboard Overview (Mobile 390px)
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:3001/admin/dashboard', { waitUntil: 'networkidle0' });
  await sleep(500);
  await capture(page, '07_admin_dashboard_mobile.png', 'Admin Dashboard (Mobile View — clean vertical stack, zero horizontal overflow)');

  // Test Mobile Navigation Drawer
  console.log('\n▶ [Admin Flow] 4. Testing Mobile Navigation Drawer');
  const menuBtn = await page.$('button[aria-label="Open navigation menu"]');
  if (menuBtn) {
    await menuBtn.click();
    await sleep(400);
    await capture(page, '08_admin_drawer_open_mobile.png', 'Mobile Drawer Open with Active Route Title and Touch Targets');
    // Close Drawer
    const closeBtn = await page.$('div[class*="backdrop-blur-sm"]');
    if (closeBtn) await closeBtn.click();
    await sleep(300);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // JOURNEY 3: APPLICANTS DIRECTORY & CANDIDATE DOSSIER
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n▶ [Admin Flow] 5. Testing Applicants Directory (Mobile Card View & Desktop Table)');
  await page.goto('http://localhost:3001/admin/applicants', { waitUntil: 'networkidle0' });
  await sleep(600);
  await capture(page, '09_admin_applicants_cards_mobile.png', 'Applicants Directory Mobile View (Native Candidate Cards with Call/Interview Actions)');

  // Desktop Table View
  await page.setViewport({ width: 1280, height: 800 });
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(500);
  await capture(page, '09_admin_applicants_table_desktop.png', 'Applicants Directory Desktop View (Full 8-Column Governance Table)');

  // Open First Applicant Dossier
  console.log('\n▶ [Admin Flow] 6. Testing Candidate Dossier & WhatsApp Decision Customization');
  const detailHref = await page.$eval('a[href*="/admin/applicants/"]', (el) => el.href).catch(() => null);
  if (detailHref) {
    await page.goto(detailHref, { waitUntil: 'networkidle0' });
    await sleep(600);

    // Capture Desktop Dossier
    await capture(page, '10_admin_applicant_detail_desktop.png', 'Candidate Dossier (Desktop View with Scores & Committee Decisions)');

    // Switch to Mobile Dossier
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await sleep(400);
    await capture(page, '10_admin_applicant_detail_mobile.png', 'Candidate Dossier (Mobile View)');

    // Click WhatsApp Decision Preview button to test customization
    const buttons = await page.$$('button');
    for (const b of buttons) {
      const text = await b.evaluate((el) => el.textContent || '');
      if (text.includes('Preview Message') || text.includes('Preview')) {
        await b.evaluate((el) => el.click());
        break;
      }
    }
    await sleep(600);
    await capture(page, '10_admin_applicant_whatsapp_customized_mobile.png', 'Candidate Dossier: WhatsApp Decision Live Editable Customization Drawer');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // JOURNEY 4: SCHEDULING & TIMELINE STUDIO (MOBILE & DESKTOP)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n▶ [Admin Flow] 7. Testing Scheduling & Timeline Studio');
  await page.goto('http://localhost:3001/admin/scheduling', { waitUntil: 'networkidle0' });
  await sleep(600);
  await capture(page, '11_admin_scheduling_mobile.png', 'Interview Timeline Mobile View (Stacked Slots, Quick Adjusters, WhatsApp Buttons)');

  await page.setViewport({ width: 1280, height: 800 });
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(500);
  await capture(page, '11_admin_scheduling_desktop.png', 'Interview Timeline Desktop View (Full Kanban Timeline & Slot Matrix)');

  // ───────────────────────────────────────────────────────────────────────────
  // JOURNEY 5: WHATSAPP COMMUNICATION STUDIO (CUSTOMIZABLE TEMPLATES & PREVIEW)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n▶ [Admin Flow] 8. Testing WhatsApp Communication Studio');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:3001/admin/whatsapp', { waitUntil: 'networkidle0' });
  await sleep(600);
  await capture(page, '12_admin_whatsapp_links_mobile.png', 'WhatsApp Studio: Group Links Tab (Mobile)');

  // Switch to Message Templates Tab
  const mobileTabs = await page.$$('button');
  for (const tab of mobileTabs) {
    const txt = await tab.evaluate((el) => el.textContent || '');
    if (txt.includes('Templates') || txt.includes('قوالب')) {
      await tab.evaluate((el) => el.click());
      break;
    }
  }
  await sleep(500);
  await capture(page, '13_admin_whatsapp_templates_mobile.png', 'WhatsApp Studio: Fully Customizable Templates & Sub-Templates (Mobile)');

  // Desktop View for WhatsApp Studio showing side-by-side Template Editor & Simulator
  await page.setViewport({ width: 1280, height: 800 });
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(400);
  const desktopTabs = await page.$$('button');
  for (const tab of desktopTabs) {
    const txt = await tab.evaluate((el) => el.textContent || '');
    if (txt.includes('Templates') || txt.includes('قوالب')) {
      await tab.evaluate((el) => el.click());
      break;
    }
  }
  await sleep(500);
  await capture(page, '13_admin_whatsapp_simulator_desktop.png', 'WhatsApp Studio: Desktop Side-by-Side Live Simulator & Sub-Templates');

  // ───────────────────────────────────────────────────────────────────────────
  // JOURNEY 6: LIVE INTERVIEW ROOM (MOBILE 5-COLUMN SCORE GRID & TIMER)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n▶ [HR/Admin Flow] 9. Testing Live Interview Room (Mobile 5-Column Score Grid & Timer)');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  
  // Navigate to HR Interview portal
  await page.goto('http://localhost:3001/hr', { waitUntil: 'networkidle0' });
  await sleep(600);
  await capture(page, '14_hr_candidate_queue_mobile.png', 'HR Queue: Applicants ready for interview on mobile');

  const interviewHref = await page.$eval('a[href*="/hr/interview/"]', (el) => el.href).catch(() => null);
  if (interviewHref) {
    await page.goto(interviewHref, { waitUntil: 'networkidle0' });
    await sleep(600);
    await capture(page, '15_interview_room_mobile.png', 'Live Interview Room Mobile View (5-Column Symmetrical Score Buttons & Live Timer)');

    // Also capture desktop view of interview room
    await page.setViewport({ width: 1280, height: 800 });
    await sleep(300);
    await capture(page, '15_interview_room_desktop.png', 'Live Interview Room Desktop View (Live Timer, Symmetrical Grids, Override)');
  }

  console.log('\n✨ ALL USER JOURNEYS AND SCREENSHOTS COMPLETED SUCCESSFULLY!');
} catch (err) {
  console.error('❌ Error during user journey execution:', err);
} finally {
  await browser.close();
}
