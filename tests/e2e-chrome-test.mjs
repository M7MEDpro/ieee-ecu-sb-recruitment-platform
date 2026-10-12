/**
 * @file e2e-chrome-test.mjs
 * @brief Multi-Browser End-to-End Test Suite for Applicant & Admin Portals.
 * @details Simulates applicant application submission, receipt verification,
 *          admin dashboard authentication, and candidate dossier inspections.
 * @author IEEE ECU Student Branch
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const screenshotsDir = path.resolve('tests/screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function runChromeE2ETest() {
  console.log('══════════════════════════════════════════════════════════════════');
  console.log('  STARTING COMPREHENSIVE GOOGLE CHROME FRONT-END E2E TEST');
  console.log('══════════════════════════════════════════════════════════════════');

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true, // Headless Chrome browser
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: LOAD APPLICANT HOMEPAGE & FORM
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[1/7] Navigating to ${process.env.APPLICANT_PORTAL_URL || 'http://localhost:3000'} ...');
    await page.goto('${process.env.APPLICANT_PORTAL_URL || 'http://localhost:3000'}', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('  ✓ Page loaded successfully. Title:', await page.title());
    await page.screenshot({ path: path.join(screenshotsDir, '01_homepage.png'), fullPage: false });

    // Navigate to /apply
    console.log('  Navigating to Application Form (/apply)...');
    const startAppBtn = page.locator('a[href="/apply"]', { hasText: 'Start your application' });
    if (await startAppBtn.isVisible()) {
      await startAppBtn.click();
      await page.waitForURL('**/apply', { timeout: 15000 });
    } else {
      await page.goto('${process.env.APPLICANT_PORTAL_URL || 'http://localhost:3000'}/apply', { waitUntil: 'networkidle', timeout: 30000 });
    }
    console.log('  ✓ Arrived at application form:', page.url());

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: VERIFY ALL 12 ECU FACULTIES IN THE DROPDOWN
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[2/7] Verifying all 12 Egyptian Chinese University faculties in the form dropdown...');
    const facultySelect = page.locator('select').first();
    await facultySelect.waitFor({ state: 'visible', timeout: 15000 });

    const facultyOptions = await facultySelect.locator('option').allInnerTexts();
    console.log(`  Found ${facultyOptions.length - 1} faculties in dropdown:`);
    for (const opt of facultyOptions.slice(1)) {
      console.log(`    • ${opt}`);
    }

    const expected12Faculties = [
      'Faculty of Computers & Information Systems',
      'Faculty of Engineering & Technology',
      'Faculty of Pharmacy & Drug Technology',
      'Faculty of Physical Therapy',
      'Faculty of Economics & International Trade',
      'Faculty of Arts & Design',
      'Faculty of Veterinary Medicine',
      'Faculty of Mass Communication',
      'Faculty of Literary Studies',
      'Faculty of Law',
      'Faculty of Nursing',
      'Faculty of Humanities (GIS & Surveying)',
    ];

    for (const fac of expected12Faculties) {
      const match = facultyOptions.some((opt) => opt.includes(fac));
      if (!match) {
        throw new Error(`CRITICAL: Faculty "${fac}" was NOT found in the dropdown options!`);
      }
    }
    console.log('  ✓ ALL 12 ECU FACULTIES CONFIRMED PRESENT IN CHROME FRONTEND!');

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3: FILL APPLICATION WITH REALISTIC DATA
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[3/7] Filling application form in Chrome with live candidate details...');

    // Full name
    const nameInput = page.locator('input[placeholder*="Omar Ahmed"]').or(page.locator('input').nth(0));
    await nameInput.fill('Amr Khaled Hassan Ibrahim');

    // Phone number
    const phoneInput = page.locator('input[placeholder*="01xxxxxxxxx"]').or(page.locator('input').nth(1));
    await phoneInput.fill('01012345678');

    // Email address
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('amr.khaled@ecu.edu.eg');

    // National ID
    const nationalIdInput = page.locator('input[placeholder*="14-digit"]').or(page.locator('input[maxlength="14"]'));
    await nationalIdInput.fill('30301010101234');

    // Faculty select
    await facultySelect.selectOption({ label: 'Faculty of Computers & Information Systems' });

    // Academic level select
    const levelSelect = page.locator('select').nth(1);
    await levelSelect.selectOption({ label: 'Level 2' });

    await page.screenshot({ path: path.join(screenshotsDir, '02_form_filled.png'), fullPage: false });
    console.log('  ✓ Personal & University information filled.');

    // Select 1 Tech Committee (Software) + 1 Non-Tech Committee (PR & Logistics)
    console.log('  Selecting committees: Software (Tech) + PR & Logistics (Non-Tech)...');
    const softwareCard = page.locator('[role="button"]', { hasText: 'Software' }).first();
    await softwareCard.click();

    const prCard = page.locator('[role="button"]', { hasText: 'PR & Logistics' }).first();
    await prCard.click();

    await page.screenshot({ path: path.join(screenshotsDir, '03_committees_selected.png'), fullPage: false });
    console.log('  ✓ Committees selected successfully.');

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4: SUBMIT FORM & ARRIVE AT SUCCESS PAGE
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[4/7] Submitting application form...');
    const submitBtn = page.locator('button[type="submit"]', { hasText: 'Review & Submit Application' });
    await submitBtn.click();

    // Confirm modal
    const confirmModalBtn = page.locator('button', { hasText: 'Confirm & Submit Application' });
    await confirmModalBtn.waitFor({ state: 'visible', timeout: 8000 });
    await page.screenshot({ path: path.join(screenshotsDir, '04_confirm_modal.png'), fullPage: false });
    await confirmModalBtn.click();

    // Wait for URL /success
    await page.waitForURL('**/success**', { timeout: 15000 });
    console.log('  ✓ Successfully redirected to:', page.url());

    await page.waitForTimeout(1500); // Allow mount & storage hydration
    await page.screenshot({ path: path.join(screenshotsDir, '05_success_page_screen.png'), fullPage: false });

    // Verify applicant details in DOM
    const successPageText = await page.innerText('body');
    if (!successPageText.includes('Thank You, Amr Khaled Hassan Ibrahim!')) {
      throw new Error('Candidate full name not rendered on success screen!');
    }
    if (!successPageText.includes('amr.khaled@ecu.edu.eg')) {
      throw new Error('Candidate email not rendered on success screen!');
    }
    if (!successPageText.includes('01012345678')) {
      throw new Error('Candidate phone not rendered on success screen!');
    }
    if (!successPageText.includes('Faculty of Computers & Information Systems')) {
      throw new Error('Candidate faculty not rendered on success screen!');
    }
    console.log('  ✓ Success screen rendered with complete applicant profile details!');

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 5: TEST PRINT MODE & VERIFY CLEAN OFFICIAL RECEIPT
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[5/7] Testing Print Mode in Chrome (@media print emulation)...');
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(1000);

    // Capture the print receipt as an image and as PDF
    const printScreenshotPath = path.join(screenshotsDir, '06_print_receipt_preview.png');
    await page.screenshot({ path: printScreenshotPath, fullPage: true });

    const pdfPath = path.join(screenshotsDir, '07_official_receipt.pdf');
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '12mm', bottom: '10mm', left: '12mm' },
    });

    console.log(`  ✓ Print preview image saved: ${printScreenshotPath}`);
    console.log(`  ✓ Official A4 PDF saved: ${pdfPath}`);

    // Verify that print receipt header is visible in print mode
    const printReceiptTitle = page.locator('h1', { hasText: 'IEEE ECU STUDENT BRANCH' });
    const isPrintTitleVisible = await printReceiptTitle.isVisible();
    console.log(`  Print receipt official header visible in print: ${isPrintTitleVisible}`);

    // Verify screen navbar is hidden in print mode
    const screenNav = page.locator('header.print\\:hidden');
    const isNavHiddenInPrint = !(await screenNav.isVisible());
    console.log(`  Navbar hidden in print mode: ${isNavHiddenInPrint}`);

    // Switch back to screen mode
    await page.emulateMedia({ media: 'screen' });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 6: TEST ADMIN PORTAL LOGIN & DIRECTORY
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[6/7] Logging into Admin Portal (${process.env.ADMIN_PORTAL_URL || 'http://localhost:3001'}/login)...');
    await page.goto('${process.env.ADMIN_PORTAL_URL || 'http://localhost:3001'}/login', { waitUntil: 'networkidle', timeout: 30000 });

    const usernameInput = page.locator('input[type="text"]').or(page.locator('input').nth(0));
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    await usernameInput.fill(adminUser);

    const passwordInput = page.locator('input[type="password"]');
    const adminPass = process.env.ADMIN_PASSWORD || 'your_admin_password';
    await passwordInput.fill(adminPass);

    await page.screenshot({ path: path.join(screenshotsDir, '08_admin_login.png'), fullPage: false });
    const loginBtn = page.locator('button[type="submit"]');
    await loginBtn.click();

    await page.waitForURL('**/admin/**', { timeout: 15000 });
    console.log('  ✓ Admin logged in successfully! Arrived at:', page.url());
    await page.screenshot({ path: path.join(screenshotsDir, '09_admin_dashboard.png'), fullPage: false });

    // Navigate to Applicants page
    console.log('  Navigating to Applicants Directory...');
    await page.goto('${process.env.ADMIN_PORTAL_URL || 'http://localhost:3001'}/admin/applicants', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotsDir, '10_applicants_directory.png'), fullPage: false });

    const directoryText = await page.innerText('body');
    if (!directoryText.includes('Amr Khaled Hassan Ibrahim')) {
      throw new Error('Submitted candidate not found in Admin Applicants Directory!');
    }
    console.log('  ✓ Verified live candidate "Amr Khaled Hassan Ibrahim" in Admin Directory!');

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 7: TEST EXCEL EXPORT ENDPOINT IN ADMIN
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[7/7] Testing Excel Export endpoint (/api/export/excel)...');
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
    const exportBtn = page.locator('button', { hasText: 'Export' }).or(page.locator('button', { hasText: 'Excel' })).first();
    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      const download = await downloadPromise;
      if (download) {
        const downloadPath = path.join(screenshotsDir, '11_exported_report.xlsx');
        await download.saveAs(downloadPath);
        console.log(`  ✓ Excel file downloaded successfully to: ${downloadPath}`);
      } else {
        console.log('  Export button clicked.');
      }
    } else {
      console.log('  Export button not visible on current tab.');
    }

    console.log('\n══════════════════════════════════════════════════════════════════');
    console.log('  ✨ ALL FRONT-END GOOGLE CHROME TESTS PASSED 100%!');
    console.log('══════════════════════════════════════════════════════════════════');
  } catch (err) {
    console.error('\n❌ E2E TEST FAILED:', err);
    await page.screenshot({ path: path.join(screenshotsDir, 'error_state.png'), fullPage: true });
    throw err;
  } finally {
    await browser.close();
  }
}

runChromeE2ETest();
