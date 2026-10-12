/**
 * @file capture-committee-question-proof.mjs
 * @brief Automated Committee Question Proof Capture.
 * @details Captures visual evidence of committee interview scoring rubrics.
 * @author IEEE ECU Student Branch
 */

import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = path.resolve('C:/Users/bdwym/.gemini/antigravity/brain/0a778c01-a3db-401d-8902-ccf145de8976');
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'screenshots');

async function captureProof() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox'],
  });

  const [page] = await browser.pages();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Login with the new admin account Youssef
  console.log('1. Logging in with new admin Youssef...');
  await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });
  await page.type('input[placeholder*="username"]', 'Youssef');
  await page.type('input[type="password"]', process.env.HR_PASSWORD || 'your_hr_password');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1200));

  // 2. Capture Criteria Studio showing the new Software question
  console.log('2. Visiting Criteria Studio...');
  await page.goto('http://localhost:3001/admin/criteria', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));
  const critPath = path.join(ARTIFACT_DIR, 'proof_01_committee_criteria_created.png');
  await page.screenshot({ path: critPath, fullPage: false });
  console.log('✓ Captured proof_01_committee_criteria_created.png');

  // 3. Visit Software Applicant Dossier showing the new criterion and its score
  console.log('3. Visiting Candidate Dossier...');
  // Find an applicant who applied to Software
  const res = await page.evaluate(async () => {
    const r = await fetch('/api/schedule');
    const d = await r.json();
    const slot = d.slots?.find(
      (s) => s.appliedTeams?.includes('Software') || s.appliedTeams?.includes('software')
    );
    return { applicantId: slot?.applicantId, slotId: slot?.id };
  });

  if (res.applicantId) {
    await page.goto(`http://localhost:3001/admin/applicants/${res.applicantId}`, {
      waitUntil: 'networkidle0',
    });
    await new Promise((r) => setTimeout(r, 1200));

    // Scroll down to the Detailed Criterion Scores section
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise((r) => setTimeout(r, 800));

    const dossierPath = path.join(ARTIFACT_DIR, 'proof_02_committee_criterion_in_dossier.png');
    await page.screenshot({ path: dossierPath, fullPage: false });
    console.log('✓ Captured proof_02_committee_criterion_in_dossier.png');
  }

  // 4. Visit Interview Room to show the question rendered live with scoring buttons
  if (res.slotId) {
    console.log('4. Visiting Live Interview Room...');
    await page.goto(`http://localhost:3001/hr/interview/${res.slotId}`, {
      waitUntil: 'networkidle0',
    });
    await new Promise((r) => setTimeout(r, 1200));

    // Scroll down to Technical Criteria section
    await page.evaluate(() => {
      const techHead = Array.from(document.querySelectorAll('h2, h3')).find((el) =>
        el.textContent.includes('Technical')
      );
      if (techHead) techHead.scrollIntoView();
    });
    await new Promise((r) => setTimeout(r, 800));

    const roomPath = path.join(ARTIFACT_DIR, 'proof_03_committee_question_in_interview_room.png');
    await page.screenshot({ path: roomPath, fullPage: false });
    console.log('✓ Captured proof_03_committee_question_in_interview_room.png');
  }

  await browser.close();
  console.log('Done!');
}

captureProof().catch(console.error);
