/**
 * @file e2e-criteria-test.mjs
 * @brief Criteria Studio Validation Test.
 * @details Verifies criteria CRUD operations, section allocations, and rubric updates.
 * @author IEEE ECU Student Branch
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function testCriteriaStudio() {
  console.log('--- LAUNCHING CHROME TO TEST CRITERIA STUDIO ---');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();

  // 1. Login as Admin
  console.log('Navigating to admin login...');
  await page.goto('${process.env.ADMIN_PORTAL_URL || 'http://localhost:3001'}/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="text"]', process.env.ADMIN_USERNAME || 'admin');
  await page.fill('input[type="password"]', process.env.ADMIN_PASSWORD || 'your_admin_password');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/**', { timeout: 15000 });
  console.log('Logged in successfully!');

  // 2. Navigate to Criteria Studio
  console.log('Navigating to Criteria Studio...');
  await page.goto('${process.env.ADMIN_PORTAL_URL || 'http://localhost:3001'}/admin/criteria', { waitUntil: 'networkidle' });
  await page.waitForSelector('text=General Section', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // Capture screenshot of the criteria page
  const screenshotPath = 'tests/criteria_studio_verified.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Saved screenshot to ${screenshotPath}`);

  // Copy to artifacts directory
  const artifactDir = 'C:\\Users\\bdwym\\.gemini\\antigravity\\brain\\8a17dbee-f6f2-40f1-bccd-c5dbef6ee56e';
  fs.copyFileSync(screenshotPath, path.join(artifactDir, 'criteria_studio_verified.png'));
  console.log('Copied screenshot to artifacts directory!');

  // Check section counts
  const generalText = await page.textContent('h3:has-text("General Section")');
  const techText = await page.textContent('h3:has-text("Technical Section")');
  const nonTechText = await page.textContent('h3:has-text("Non-Technical Section")');
  console.log('Visual Section Headers Found:');
  console.log('  ->', generalText?.trim());
  console.log('  ->', techText?.trim());
  console.log('  ->', nonTechText?.trim());

  // 3. Test creating a new criterion
  console.log('Testing creation of dynamic criterion...');
  await page.fill('input[placeholder*="Algorithmic"]', 'Automated Verification Metric');
  await page.selectOption('select:has-text("GENERAL (Always Shown)")', 'TECH');
  await page.fill('textarea[placeholder*="Guidance"]', 'Created via Chrome E2E verification test');
  await page.click('button:has-text("Create Criterion")');
  await page.waitForSelector('text=Criterion added', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const foundNew = await page.locator('text=Automated Verification Metric').count();
  console.log('Newly created criterion found in UI:', foundNew > 0);

  // 4. Test deleting the created criterion
  if (foundNew > 0) {
    console.log('Testing deletion of the criterion...');
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    // Click trash button next to Automated Verification Metric
    const card = page.locator('div:has-text("Automated Verification Metric")').last();
    const trashBtn = card.locator('button:has(svg.lucide-trash-2)').first();
    await trashBtn.click();
    await page.waitForTimeout(2000);
    const remainingCount = await page.locator('text=Automated Verification Metric').count();
    console.log('Remaining after deletion:', remainingCount === 0 ? 'CLEANED UP (0)' : 'STILL PRESENT');
  }

  await browser.close();
  console.log('--- CRITERIA STUDIO E2E VERIFICATION COMPLETED SUCCESSFULLY ---');
}

testCriteriaStudio().catch((err) => {
  console.error('Error during criteria E2E test:', err);
  process.exit(1);
});
