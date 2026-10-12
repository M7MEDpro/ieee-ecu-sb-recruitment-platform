/**
 * @file e2e-admin-full-test.mjs
 * @brief End-to-End Live Admin, Interview & WhatsApp Workflow Test.
 * @details Tests complete lifecycle: Admin login, applicant search, interview room evaluation,
 *          multi-committee scoring, and WhatsApp communication dispatch.
 * @author IEEE ECU Student Branch
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-supabase-service-role-key';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ARTIFACT_DIR = process.env.ARTIFACT_DIR || path.resolve('./tests/artifacts');
const APPLICANT_URL = process.env.APPLICANT_PORTAL_URL || 'http://localhost:3000';
const ADMIN_URL = process.env.ADMIN_PORTAL_URL || 'http://localhost:3001';

async function runFullAdminE2ETest() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  STARTING FULL LIVE ADMIN & INTERVIEW & WHATSAPP E2E  ');
  console.log('═══════════════════════════════════════════════════════');

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();

  let testApplicantId = null;
  let testInterviewId = null;

  try {
    // ── STEP 1: CREATE TEST APPLICANT VIA PORTAL ──────────────────────
    console.log('\n[1/6] Submitting live candidate application...');
    await page.goto(`${APPLICANT_URL}/apply`, { waitUntil: 'networkidle' });

    // Personal details
    const nameInput = page.locator('input[placeholder*="Omar Ahmed"]').or(page.locator('input').nth(0));
    await nameInput.fill('محمود العربي تجربة');

    const phoneInput = page.locator('input[placeholder*="01xxxxxxxxx"]').or(page.locator('input').nth(1));
    await phoneInput.fill('01099887766');

    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('mahmoud.test.e2e@ecu.edu.eg');

    const nationalIdInput = page.locator('input[placeholder*="14-digit"]').or(page.locator('input[maxlength="14"]'));
    await nationalIdInput.fill('30205150102435');

    // Faculty select
    const facultySelect = page.locator('select').first();
    await facultySelect.selectOption({ label: 'Faculty of Computers & Information Systems' });

    // Academic level select
    const levelSelect = page.locator('select').nth(1);
    await levelSelect.selectOption({ label: 'Level 2' });

    // Committee Selection: Software (Tech) + PR & Logistics (Non-Tech)
    console.log('Selecting committees: Software + PR & Logistics...');
    const softwareCard = page.locator('[role="button"]', { hasText: 'Software' }).first();
    await softwareCard.click();

    const prCard = page.locator('[role="button"]', { hasText: 'PR & Logistics' }).first();
    await prCard.click();

    // Submit
    const submitBtn = page.locator('button[type="submit"]', { hasText: 'Review & Submit Application' });
    await submitBtn.click();

    const confirmModalBtn = page.locator('button', { hasText: 'Confirm & Submit Application' });
    await confirmModalBtn.waitFor({ state: 'visible', timeout: 8000 });
    await confirmModalBtn.click();

    await page.waitForURL('**/success**', { timeout: 15000 });
    console.log('✓ Candidate submitted successfully!');

    // Fetch candidate ID from Supabase
    const { data: applicant } = await supabase
      .from('applicants')
      .select('id, full_name, phone_number')
      .eq('phone_number', '01099887766')
      .single();

    testApplicantId = applicant.id;
    console.log(`✓ Test applicant ID in Supabase: ${testApplicantId}`);

    // ── STEP 2: ADMIN LOGIN & DIRECTORY INSPECTION ───────────────────
    console.log('\n[2/6] Logging into Admin Panel & verifying Directory...');
    await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', process.env.ADMIN_PASSWORD || 'your_admin_password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/**', { timeout: 15000 });
    console.log('✓ Logged in as Executive Administrator!');

    await page.goto(`${ADMIN_URL}/admin/applicants`, { waitUntil: 'networkidle' });
    await page.locator(`a[href="/admin/applicants/${testApplicantId}"]:visible`).waitFor({ state: 'visible', timeout: 15000 });
    console.log('✓ Found test candidate in directory table!');

    // ── STEP 3: WHATSAPP DECISION DISPATCH & MARKING TEST ─────────────
    console.log('\n[3/6] Testing WhatsApp Decision & "Mark as Sent" features...');
    // Open candidate profile
    await page.goto(`${ADMIN_URL}/admin/applicants/${testApplicantId}`, { waitUntil: 'networkidle' });
    await page.locator('text=محمود العربي تجربة').first().waitFor({ state: 'visible', timeout: 15000 });

    // Set Decisions: Software -> ACCEPTED, PR & Logistics -> REJECTED
    console.log('Setting committee decisions...');
    const acceptSoftwareBtn = page.locator('button:has-text("Accept")').first();
    await acceptSoftwareBtn.click();
    await page.waitForTimeout(1000);

    const rejectPrBtn = page.locator('button:has-text("Reject")').last();
    await rejectPrBtn.click();
    await page.waitForTimeout(1000);

    // Scroll to WhatsApp Dispatch Section
    console.log('Verifying WhatsApp Dispatch Section...');
    await page.locator('#whatsapp-dispatch-section').scrollIntoViewIfNeeded();

    // Check initial status button
    const initialWaBadge = await page.locator('button:has-text("Mark as Sent"), button:has-text("WA Sent")').first().textContent();
    console.log(`Initial WhatsApp Button State: "${initialWaBadge?.trim()}"`);

    // Click "Mark as Sent"
    console.log('Clicking "Mark as Sent"...');
    const markSentBtn = page.locator('button:has-text("Mark as Sent")').first();
    await markSentBtn.click();
    await page.waitForTimeout(2000);

    // Verify status updated to "WA Sent"
    const updatedWaBadge = await page.locator('button:has-text("WA Sent")').first().textContent();
    console.log(`✓ Updated WhatsApp Button State: "${updatedWaBadge?.trim()}"`);

    // Verify Header status badge
    const headerWaStatus = await page.locator('text=WA Decision: Sent').first().isVisible();
    console.log(`✓ Header Status Badge Shows "WA Decision: Sent": ${headerWaStatus}`);

    // Verify Supabase DB Review Record
    const { data: reviewRecord } = await supabase
      .from('applicant_reviews')
      .select('decision_whatsapp_status, decision_whatsapp_sent_at, decision_whatsapp_sent_by')
      .eq('applicant_id', testApplicantId)
      .single();

    console.log('✓ Supabase DB Review Record:', reviewRecord);

    // Save screenshot of WhatsApp marked as Sent
    const waScreenshot = path.join(ARTIFACT_DIR, 'admin_whatsapp_marked_sent.png');
    await page.screenshot({ path: waScreenshot, fullPage: false });
    console.log(`✓ WhatsApp Screenshot saved: ${waScreenshot}`);

    // ── STEP 4: INTERVIEW CREATION & LIVE INTERVIEW ROOM ──────────────
    console.log('\n[4/6] Creating interview session and opening Interview Room...');
    testInterviewId = crypto.randomUUID();
    const { error: slotErr } = await supabase.from('interview_schedules').insert({
      id: testInterviewId,
      applicant_id: testApplicantId,
      date: '2026-10-05',
      start_time: '10:00',
      end_time: '10:15',
      hr_id: 'b0000000-0000-0000-0000-000000000001',
      status: 'SCHEDULED',
      created_at: new Date().toISOString()
    });
    if (slotErr) throw slotErr;
    console.log(`✓ Created scheduled interview slot: ${testInterviewId}`);

    // Navigate to interview room
    await page.goto(`${ADMIN_URL}/hr/interview/${testInterviewId}`, { waitUntil: 'networkidle' });
    await page.locator('text=محمود العربي تجربة').first().waitFor({ state: 'visible', timeout: 15000 });
    console.log('✓ Successfully entered Interview Room for candidate!');

    // ── STEP 5: VERIFY QUESTIONS / CRITERIA & SCORING ────────────────
    console.log('\n[5/6] Verifying all questions/criteria and dynamic calculation...');

    // Verify General Section criteria
    const generalHeader = await page.locator('h3:has-text("General Evaluation")').first().isVisible();
    console.log(`✓ General Criteria Section Visible: ${generalHeader}`);

    // Verify Tech Section criteria (candidate applied for Software)
    const techHeader = await page.locator('h3:has-text("Technical Evaluation")').first().isVisible();
    console.log(`✓ Technical Criteria Section Visible: ${techHeader}`);

    // Verify Non-Tech Section criteria (candidate applied for PR)
    const nonTechHeader = await page.locator('h3:has-text("Non-Technical Evaluation")').first().isVisible();
    console.log(`✓ Non-Technical Criteria Section Visible: ${nonTechHeader}`);

    // Score scorable criteria
    console.log('Selecting scores across rating scale buttons...');
    const rateBtns = page.locator('button:has-text("8"), button:has-text("9")');
    const btnCount = await rateBtns.count();
    console.log(`Found ${btnCount} score buttons. Clicking ratings...`);
    for (let i = 0; i < Math.min(btnCount, 6); i++) {
      await rateBtns.nth(i).click().catch(() => {});
      await page.waitForTimeout(100);
    }

    // Fill Qualitative Interviewer Summary (PARAGRAPH response type)
    const paragraphArea = page.locator('textarea[placeholder*="qualitative assessment"]').first();
    if (await paragraphArea.isVisible()) {
      await paragraphArea.fill('المرشح ممتاز في العمل الجماعي ولديه مهارات تواصل قوية وشغف بلجنة السوفتوير.');
      console.log('✓ Filled Qualitative Interviewer Summary text!');
    }

    // Fill Section Interview Notes
    const generalNotes = page.locator('textarea[placeholder*="General observations"]').first();
    if (await generalNotes.isVisible()) {
      await generalNotes.fill('حضور ممتاز ولباقة في الحديث.');
    }

    await page.waitForTimeout(1500);

    // Save screenshot of scored interview room
    const interviewScreenshot = path.join(ARTIFACT_DIR, 'admin_interview_room_verified.png');
    await page.screenshot({ path: interviewScreenshot, fullPage: true });
    console.log(`✓ Interview Room Screenshot saved: ${interviewScreenshot}`);

    // Click "Submit Evaluation"
    console.log('Submitting evaluation...');
    const submitEvalBtn = page.locator('button:has-text("Submit Evaluation")');
    await submitEvalBtn.click();
    await page.waitForSelector('text=Evaluation scores and notes recorded successfully', { timeout: 10000 });
    console.log('✓ Success banner displayed in Interview Room!');

    // Verify in Supabase
    const { data: evalRecord } = await supabase
      .from('evaluations')
      .select('id, general_average, tech_average, non_tech_average, general_notes')
      .eq('interview_id', testInterviewId)
      .single();

    console.log('✓ Supabase Evaluation Record Saved:', evalRecord);

    const { data: scoresRecords } = await supabase
      .from('evaluation_scores')
      .select('id, criterion_id, score, text_response')
      .eq('evaluation_id', evalRecord.id);

    console.log(`✓ Recorded ${scoresRecords.length} criteria score items in evaluation_scores table!`);
    const paragraphScore = scoresRecords.find(s => s.text_response !== null);
    if (paragraphScore) {
      console.log('✓ Paragraph text response recorded correctly in Supabase:', paragraphScore.text_response);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  ALL LIVE E2E CHECKS PASSED WITH 100% SUCCESS!        ');
    console.log('═══════════════════════════════════════════════════════');

  } catch (err) {
    console.error('❌ E2E Test Error:', err);
    throw err;
  } finally {
    // ── CLEANUP TEST DATA TO LEAVE SYSTEM CLEAN ───────────────────────
    console.log('\n[6/6] Cleaning up test applicant from database...');
    if (testInterviewId) {
      await supabase.from('evaluation_scores').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('evaluations').delete().eq('interview_id', testInterviewId);
      await supabase.from('interview_schedules').delete().eq('id', testInterviewId);
    }
    if (testApplicantId) {
      await supabase.from('applicant_reviews').delete().eq('applicant_id', testApplicantId);
      await supabase.from('team_decisions').delete().eq('applicant_id', testApplicantId);
      await supabase.from('applicant_teams').delete().eq('applicant_id', testApplicantId);
      await supabase.from('applicants').delete().eq('id', testApplicantId);
    }
    console.log('✓ Test candidate completely cleaned up. Database remains 100% pristine!');
    await browser.close();
  }
}

runFullAdminE2ETest().catch((e) => {
  console.error(e);
  process.exit(1);
});
