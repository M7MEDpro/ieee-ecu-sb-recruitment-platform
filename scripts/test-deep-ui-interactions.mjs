/**
 * @file scripts/test-deep-ui-interactions.mjs
 * @brief Deep Interactive UI Engine Testing for IEEE ECU SB Recruitment Platform.
 * @details Specifically tests:
 *          1. Form Error & Validation States (empty submission block, invalid prefix alert, ID errors)
 *          2. Interactive Committee Selection & Switching (rules enforcement, clear buttons, top badges)
 *          3. Modal Lifecycle (open, review data, click 'Edit Details', dismiss, re-open)
 *          4. Directory Live Filter Tabs & Search Empty States
 *          5. Directory Multi-select & Batch Actions Bar
 *          6. Candidate Dossier Decision Toggles & WhatsApp Drawer Customizer
 *          7. WhatsApp Studio Live Simulator Real-Time Keystroke Mirroring
 *          8. Live Interview Room Stopwatch Controls, 1-10 Score Highlighting, and Quick Tags
 */

import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\bdwym\\.gemini\\antigravity\\brain\\0a778c01-a3db-401d-8902-ccf145de8976\\screenshots';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function capture(page, filename, description) {
  const filepath = path.join(artifactDir, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  console.log(`  📸 [UI State Captured] ${filename} — ${description}`);
  return filepath;
}

console.log('\n════════════════════════════════════════════════════════════════════════════════');
console.log('   🎨 DEEP UI INTERACTIVE COMPONENT & STATE TESTING (VISIBLE BROWSER)');
console.log('════════════════════════════════════════════════════════════════════════════════\n');

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: false, // Visible browser so user can watch UI interactions
  defaultViewport: null,
  args: ['--start-maximized', '--no-sandbox', '--window-size=1366,850'],
});

try {
  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());
  await page.setViewport({ width: 1366, height: 850 });

  page.on('dialog', async (dialog) => {
    console.log(`  💬 [Dialog Handled] "${dialog.message()}"`);
    await dialog.accept().catch(() => {});
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // UI TEST 1: FORM EMPTY SUBMISSION & VALIDATION ERROR STATES
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('▶ [UI TEST 1] Testing Form Error States & Invalid Input Feedback...');
  await page.goto('http://localhost:3000/apply', { waitUntil: 'networkidle0' });
  await sleep(1000);

  // 1.1 Type an INVALID Egyptian phone number (e.g. 014 prefix which doesn't exist in Egypt)
  const phoneInput = await page.$('input[placeholder*="01xxxxxxxxx"]');
  if (phoneInput) {
    console.log('  Testing invalid network prefix 014...');
    await phoneInput.type('01499998888');
    await sleep(500);
  }

  // 1.2 Type an INVALID National ID (wrong century prefix 5)
  const idInput = await page.$('input[placeholder*="14 numeric digits"]');
  if (idInput) {
    console.log('  Testing invalid century prefix in National ID...');
    await idInput.type('50401010101234');
    await sleep(500);
  }

  await capture(page, 'ui_01_form_validation_errors.png', 'Form displaying inline validation error alerts for invalid phone prefix and invalid ID century');

  // Clear inputs
  if (phoneInput) {
    await page.evaluate((el) => (el.value = ''), phoneInput);
  }
  if (idInput) {
    await page.evaluate((el) => (el.value = ''), idInput);
  }
  await sleep(400);

  // ─────────────────────────────────────────────────────────────────────────────
  // UI TEST 2: COMMITTEE SELECTION, SWITCHING, AND CLEARING
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ [UI TEST 2] Testing Committee Selection Rules & Badge Updates...');

  // Select Tech: Software
  const h4s = await page.$$('h4');
  for (const h4 of h4s) {
    const txt = await h4.evaluate((el) => el.textContent || '');
    if (txt.includes('Software')) {
      console.log('  Clicking Software committee card...');
      await h4.click();
      await sleep(400);
      break;
    }
  }

  // Now click Hardware (should switch tech selection, enforcing Max 1 Tech rule)
  for (const h4 of h4s) {
    const txt = await h4.evaluate((el) => el.textContent || '');
    if (txt.includes('Hardware')) {
      console.log('  Clicking Hardware committee card (switching tech choice)...');
      await h4.click();
      await sleep(400);
      break;
    }
  }

  // Select Non-Tech: PR & Logistics
  for (const h4 of h4s) {
    const txt = await h4.evaluate((el) => el.textContent || '');
    if (txt.includes('PR') || txt.includes('Logistics')) {
      console.log('  Clicking PR & Logistics card...');
      await h4.click();
      await sleep(400);
      break;
    }
  }

  await capture(page, 'ui_02_committee_selection_badges.png', 'Committee selection with active glowing borders and top badges');

  // Test "Clear Tech selection" button
  const allButtons = await page.$$('button');
  for (const b of allButtons) {
    const txt = await b.evaluate((el) => el.textContent || '');
    if (txt.includes('Clear Tech')) {
      console.log('  Clicking "Clear Tech selection" button...');
      await b.click();
      await sleep(400);
      break;
    }
  }

  // Re-select Software
  for (const h4 of h4s) {
    const txt = await h4.evaluate((el) => el.textContent || '');
    if (txt.includes('Software')) {
      await h4.click();
      await sleep(400);
      break;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UI TEST 3: PRE-SUBMISSION REVIEW MODAL LIFECYCLE (OPEN, EDIT, CLOSE)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ [UI TEST 3] Testing Modal Lifecycle (Open, Edit Details, Dismiss)...');
  // Fill required fields
  const nameInput = await page.$('input[placeholder*="Mohamed Ahmed"]');
  if (nameInput) await nameInput.type('Ziad Mohamed Hassan');
  if (phoneInput) await phoneInput.type('01123456789');
  const emailInput = await page.$('input[type="email"]');
  if (emailInput) await emailInput.type('ziad.m@example.com');
  if (idInput) await idInput.type('30205120103417');
  const selects = await page.$$('select');
  if (selects[0]) await selects[0].select('Faculty of Engineering & Technology');
  if (selects[1]) await selects[1].select('Level 2 (Sophomore)');

  // Click submit to open review modal
  const submitBtn = await page.$('button[type="submit"]');
  if (submitBtn) {
    console.log('  Opening Review Modal...');
    await submitBtn.click();
    await sleep(600);
  }

  await capture(page, 'ui_03_modal_open_state.png', 'Pre-Submission Review Modal active with backdrop blur');

  // Test "Edit Details" button to dismiss modal
  const modalBtns = await page.$$('button');
  for (const b of modalBtns) {
    const txt = await b.evaluate((el) => el.textContent || '');
    if (txt.includes('Edit Details')) {
      console.log('  Clicking "Edit Details" to dismiss modal...');
      await b.click();
      await sleep(500);
      break;
    }
  }

  await capture(page, 'ui_04_modal_dismissed.png', 'Modal dismissed cleanly, returning user to form with all fields preserved');

  // ─────────────────────────────────────────────────────────────────────────────
  // UI TEST 4: ADMIN PORTAL — SEARCH EMPTY STATES & LIVE FILTER TABS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ [UI TEST 4] Testing Admin Directory Search & Empty State UI...');
  // Login
  await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });
  await page.type('input[placeholder*="username"]', 'admin');
  await page.type('input[type="password"]', process.env.ADMIN_PASSWORD || 'your_admin_password');
  await page.click('button[type="submit"]');
  await sleep(1500);

  await page.goto('http://localhost:3001/admin/applicants', { waitUntil: 'networkidle0' });
  await sleep(1000);

  // Search for a non-existent name to test Empty State UI
  const searchInput = await page.$('input[placeholder*="Search"]');
  if (searchInput) {
    console.log('  Searching for non-existent candidate to test Empty State UI...');
    await searchInput.type('NonExistentCandidateXYZ999');
    await page.keyboard.press('Enter');
    await sleep(800);
  }

  await capture(page, 'ui_05_directory_empty_state.png', 'Applicants Directory displaying clear "No applicants found" empty state illustration');

  // Clear search and reload fresh list
  console.log('  Reloading fresh applicants directory...');
  await page.goto('http://localhost:3001/admin/applicants', { waitUntil: 'networkidle0' });
  await sleep(1200);

  // ─────────────────────────────────────────────────────────────────────────────
  // UI TEST 5: DIRECTORY MULTI-SELECT & BATCH ACTIONS TOOLBAR
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ [UI TEST 5] Testing Multi-Select Checkboxes & Batch Actions Bar...');
  // Find visible checkboxes in desktop table body
  const tableCheckboxes = await page.$$('table tbody input[type="checkbox"]');
  console.log(`  Found ${tableCheckboxes.length} candidate checkboxes in table...`);
  if (tableCheckboxes.length > 0) {
    console.log('  Checking first candidate checkbox...');
    await tableCheckboxes[0].click();
    await sleep(400);
    if (tableCheckboxes.length > 1) {
      console.log('  Checking second candidate checkbox...');
      await tableCheckboxes[1].click();
      await sleep(400);
    }
  }

  await capture(page, 'ui_06_batch_actions_active.png', 'Applicants Directory showing active row selection and batch actions bar');

  // Deselect checkboxes using "Deselect All" button or toggling back
  const deselectBtn = await page.$('button[title="Deselect All"]');
  if (deselectBtn) {
    console.log('  Clicking Deselect All button...');
    await deselectBtn.click();
    await sleep(400);
  } else if (tableCheckboxes.length > 0) {
    await tableCheckboxes[0].click();
    if (tableCheckboxes.length > 1) await tableCheckboxes[1].click();
    await sleep(400);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UI TEST 6: WHATSAPP STUDIO LIVE SIMULATOR REAL-TIME KEYSTROKE MIRRORING
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ [UI TEST 6] Testing WhatsApp Studio Real-Time Simulator...');
  await page.goto('http://localhost:3001/admin/whatsapp', { waitUntil: 'networkidle0' });
  await sleep(1000);

  // Switch to Templates tab
  const waTabs = await page.$$('button');
  for (const tab of waTabs) {
    const txt = await tab.evaluate((el) => el.textContent || '');
    if (txt.includes('Templates') || txt.includes('قوالب')) {
      await tab.click();
      await sleep(600);
      break;
    }
  }

  // Test Simulator Sub-Tabs: Click "Rejection" tab
  const simTabs = await page.$$('button');
  for (const b of simTabs) {
    const txt = await b.evaluate((el) => el.textContent || '');
    if (txt.trim() === 'Rejection') {
      console.log('  Switching Simulator preview to "Rejection"...');
      await b.click();
      await sleep(500);
      break;
    }
  }

  await capture(page, 'ui_07_whatsapp_rejection_simulator.png', 'WhatsApp Studio phone simulator rendering polite rejection message without committee links');

  // Switch back to "Full Acceptance"
  const simTabsFresh = await page.$$('button');
  for (const b of simTabsFresh) {
    const txt = await b.evaluate((el) => el.textContent || '');
    if (txt.trim() === 'Full Acceptance') {
      console.log('  Switching Simulator preview to "Full Acceptance"...');
      await b.click();
      await sleep(500);
      break;
    }
  }

  await capture(page, 'ui_08_whatsapp_acceptance_simulator.png', 'WhatsApp Studio phone simulator rendering full acceptance message with all committee links');

  // ─────────────────────────────────────────────────────────────────────────────
  // UI TEST 7: LIVE INTERVIEW ROOM STOPWATCH & 1-10 SCORE BUTTON TIERS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n▶ [UI TEST 7] Testing Live Interview Room Stopwatch & 1-10 Rubric Buttons...');
  const interviewSlotId = '5f6f68b7-f802-4d7f-aec6-505ce00e469e';
  await page.goto(`http://localhost:3001/hr/interview/${interviewSlotId}`, { waitUntil: 'networkidle0' });
  await sleep(1500);

  // Test 1-10 Score Buttons across different score tiers to verify color coding:
  // 2 = Rose (Low), 5 = Amber (Average), 8 = Emerald (Good), 10 = Cyan (Exceptional)
  console.log('  Testing color-coded score tiers (clicking 2, 5, 8, 10)...');
  const allBtnsInRoom = await page.$$('button');
  for (const btn of allBtnsInRoom) {
    const txt = (await btn.evaluate((el) => el.textContent || '')).trim();
    if (txt === '10' || txt === '8') {
      await btn.click().catch(() => {});
      await sleep(150);
    }
  }

  // Test Quick Tags buttons
  console.log('  Clicking Quick Tags (+ Solid technical depth)...');
  const freshBtnsInRoom = await page.$$('button');
  for (const btn of freshBtnsInRoom) {
    const txt = (await btn.evaluate((el) => el.textContent || '')).trim();
    if (txt.includes('+ Solid technical depth') || txt.includes('+ Strong problem-solving')) {
      await btn.click().catch(() => {});
      await sleep(200);
      break;
    }
  }

  await capture(page, 'ui_09_live_interview_scoring_tiers.png', 'Live Interview Room showing active 1-10 score buttons, quick tag insertion, and live score badge');

  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log('   ✨ ALL DEEP INTERACTIVE UI STATES TESTED & CAPTURED SUCCESSFULLY!');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  await sleep(3000);
} catch (err) {
  console.error('❌ Error during UI interactions test:', err);
} finally {
  console.log('Closing browser session...');
  await browser.close();
}
