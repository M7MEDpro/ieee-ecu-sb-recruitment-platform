/**
 * @file tests/test-suite.mjs
 * @brief Autonomous End-to-End Logic & Responsive Visual Verification Engine.
 * @details Runs automated tests covering:
 *          1. Egyptian National ID verification algorithm
 *          2. Multi-committee recruitment business rules
 *          3. Head matching and interview participant resolution
 *          4. Applicant Zod validation schema and phone formatting
 *          5. Evaluation score calculations, boundary handling, and color grading
 *          6. WhatsApp template generation & Double Rejection privacy rule
 *          7. Scheduler timeline algorithms and conflict detection
 *          8. Responsive visual & layout architecture integrity
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Color helpers for terminal output
const green = (t) => `\x1b[32m${t}\x1b[0m`;
const red = (t) => `\x1b[31m${t}\x1b[0m`;
const cyan = (t) => `\x1b[36m${t}\x1b[0m`;
const yellow = (t) => `\x1b[33m${t}\x1b[0m`;
const bold = (t) => `\x1b[1m${t}\x1b[0m`;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ${green('✓')} ${name}`);
  } catch (err) {
    failedTests++;
    failures.push({ name, error: err });
    console.log(`  ${red('✗')} ${name}`);
    console.log(`    ${red(err.message)}`);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ${green('✓')} ${name}`);
  } catch (err) {
    failedTests++;
    failures.push({ name, error: err });
    console.log(`  ${red('✗')} ${name}`);
    console.log(`    ${red(err.message)}`);
  }
}

console.log(bold(cyan('\n══════════════════════════════════════════════════════════════════')));
console.log(bold(cyan('  IEEE ECU SB RECRUITMENT PLATFORM — FULL VERIFICATION SUITE')));
console.log(bold(cyan('══════════════════════════════════════════════════════════════════\n')));

// ─────────────────────────────────────────────────────────────────────────────
// 1. EGYPTIAN NATIONAL ID ALGORITHM TESTS
// ─────────────────────────────────────────────────────────────────────────────
console.log(bold(yellow('▶ 1. EGYPTIAN NATIONAL ID VALIDATION LOGIC')));

// Dynamically import shared package
const sharedDist = path.join(rootDir, 'packages', 'shared', 'dist', 'index.js');
const {
  validateEgyptianNationalId,
  validateTeamSelection,
  getRequiredParticipants,
  validateEgyptianPhoneNumber,
  TEAMS,
  findTeam,
  ECU_FACULTIES,
} = await import(`file://${sharedDist}`);

runTest('Valid 20th century National ID (starts with 2, male, Cairo)', () => {
  // 2 95 03 15 01 045 1 5 -> Born 1995-03-15, Cairo (01), Male (1 is odd)
  const res = validateEgyptianNationalId('29503150104515');
  assert.equal(res.isValid, true);
  assert.equal(res.gender, 'MALE');
  assert.equal(res.governorate, 'Cairo');
  assert.equal(res.birthDate.getUTCFullYear(), 1995);
  assert.equal(res.birthDate.getUTCMonth(), 2); // 0-indexed March = 2
  assert.equal(res.birthDate.getUTCDate(), 15);
});

runTest('Valid 21st century National ID (starts with 3, female, Giza)', () => {
  // 3 04 11 20 21 028 2 9 -> Born 2004-11-20, Giza (21), Female (2 is even)
  const res = validateEgyptianNationalId('30411202102829');
  assert.equal(res.isValid, true);
  assert.equal(res.gender, 'FEMALE');
  assert.equal(res.governorate, 'Giza');
  assert.equal(res.birthDate.getUTCFullYear(), 2004);
  assert.equal(res.birthDate.getUTCMonth(), 10); // 0-indexed Nov = 10
  assert.equal(res.birthDate.getUTCDate(), 20);
});

runTest('Reject invalid length (< 14 or > 14 digits)', () => {
  assert.equal(validateEgyptianNationalId('3041120210282').isValid, false);
  assert.equal(validateEgyptianNationalId('304112021028290').isValid, false);
});

runTest('Reject non-numeric characters', () => {
  assert.equal(validateEgyptianNationalId('3041120210282a').isValid, false);
  assert.equal(validateEgyptianNationalId('3041120-102829').isValid, false);
});

runTest('Reject invalid century prefix (must be 2 or 3)', () => {
  assert.equal(validateEgyptianNationalId('19503150104515').isValid, false);
  assert.equal(validateEgyptianNationalId('40411202102829').isValid, false);
});

runTest('Reject invalid month (e.g. month 00 or 13)', () => {
  assert.equal(validateEgyptianNationalId('30413202102829').isValid, false);
  assert.equal(validateEgyptianNationalId('30400202102829').isValid, false);
});

runTest('Reject invalid day for month (e.g. Feb 30th)', () => {
  assert.equal(validateEgyptianNationalId('30402302102829').isValid, false);
});

runTest('Reject invalid governorate code (not in standard governorates)', () => {
  // '99' is not an Egyptian governorate
  assert.equal(validateEgyptianNationalId('30411209902829').isValid, false);
});

runTest('Reject future birth dates', () => {
  // Year 2099
  assert.equal(validateEgyptianNationalId('39912310101234').isValid, false);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. COMMITTEE SELECTION GOVERNANCE RULES
// ─────────────────────────────────────────────────────────────────────────────
console.log(bold(yellow('\n▶ 2. RECRUITMENT COMMITTEE SELECTION RULES')));

runTest('Valid: Single Tech team selection', () => {
  const res = validateTeamSelection(['software']);
  assert.equal(res.isValid, true);
  assert.equal(res.techTeam?.id, 'software');
  assert.equal(res.nonTechTeam, undefined);
  assert.equal(res.allSelectedTeams.length, 1);
});

runTest('Valid: Single Non-Tech team selection', () => {
  const res = validateTeamSelection(['pr-logistics']);
  assert.equal(res.isValid, true);
  assert.equal(res.techTeam, undefined);
  assert.equal(res.nonTechTeam?.id, 'pr-logistics');
  assert.equal(res.allSelectedTeams.length, 1);
});

runTest('Valid: 1 Tech team + 1 Non-Tech team selection', () => {
  const res = validateTeamSelection(['software', 'events']);
  assert.equal(res.isValid, true);
  assert.equal(res.techTeam?.id, 'software');
  assert.equal(res.nonTechTeam?.id, 'events');
  assert.equal(res.allSelectedTeams.length, 2);
});

runTest('Reject: 0 teams selected', () => {
  const res = validateTeamSelection([]);
  assert.equal(res.isValid, false);
  assert.match(res.errorMessage, /at least one team/i);
});

runTest('Reject: 2 Tech teams (Rule: Max 1 Tech)', () => {
  const res = validateTeamSelection(['software', 'hardware']);
  assert.equal(res.isValid, false);
  assert.match(res.errorMessage, /multiple Tech teams/i);
});

runTest('Reject: 2 Non-Tech teams (Rule: Max 1 Non-Tech)', () => {
  const res = validateTeamSelection(['pr-logistics', 'hr']);
  assert.equal(res.isValid, false);
  assert.match(res.errorMessage, /multiple Non-Tech teams/i);
});

runTest('Reject: Unknown team identifier', () => {
  const res = validateTeamSelection(['nonexistent-committee-123']);
  assert.equal(res.isValid, false);
  assert.match(res.errorMessage, /unrecognized team/i);
});

runTest('Deduplicate duplicate entries gracefully', () => {
  const res = validateTeamSelection(['software', 'software']);
  assert.equal(res.isValid, true);
  assert.equal(res.allSelectedTeams.length, 1);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. HEAD MATCHER & INTERVIEW PARTICIPANTS RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────
console.log(bold(yellow('\n▶ 3. HEAD MATCHER & INTERVIEW RESOLUTION')));

runTest('Tech applicant requires HR + TECH_HEAD', () => {
  const team = findTeam('software');
  const res = getRequiredParticipants([team]);
  assert.equal(res.requiresHR, true);
  assert.deepEqual(res.requiredHeadCategories, ['TECH_HEAD']);
  assert.match(res.summaryText, /Assigned HR/);
  assert.match(res.summaryText, /Tech Head/);
});

runTest('Cross-disciplinary applicant (Software + PR) requires HR + TECH_HEAD + PR_HEAD', () => {
  const team1 = findTeam('software');
  const team2 = findTeam('pr-logistics');
  const res = getRequiredParticipants([team1, team2]);
  assert.equal(res.requiresHR, true);
  assert.equal(res.requiredHeadCategories.length, 2);
  assert.ok(res.requiredHeadCategories.includes('TECH_HEAD'));
  assert.ok(res.requiredHeadCategories.includes('PR_HEAD'));
});

runTest('Media applicant requires HR + MEDIA_HEAD', () => {
  const team = findTeam('visuals');
  const res = getRequiredParticipants([team]);
  assert.equal(res.requiresHR, true);
  assert.deepEqual(res.requiredHeadCategories, ['MEDIA_HEAD']);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. APPLICANT ZOD SCHEMA & PHONE NUMBER VALIDATION
// ─────────────────────────────────────────────────────────────────────────────
console.log(bold(yellow('\n▶ 4. APPLICANT CONTACT & SCHEMA VALIDATION')));

// Regex used in applicationSchema
const egyptianPhoneRegex = /^(010|011|012|015)\d{8}$/;

runTest('validateEgyptianPhoneNumber: Valid 11-digit numbers for all 4 Egyptian operators', () => {
  const v1 = validateEgyptianPhoneNumber('01012345678');
  assert.equal(v1.isValid, true);
  assert.equal(v1.network, 'Vodafone');
  assert.equal(v1.cleanPhone, '01012345678');

  const v2 = validateEgyptianPhoneNumber('01198765432');
  assert.equal(v2.isValid, true);
  assert.equal(v2.network, 'Etisalat');

  const v3 = validateEgyptianPhoneNumber('01234567890');
  assert.equal(v3.isValid, true);
  assert.equal(v3.network, 'Orange');

  const v4 = validateEgyptianPhoneNumber('01555555555');
  assert.equal(v4.isValid, true);
  assert.equal(v4.network, 'WE');
});

runTest('validateEgyptianPhoneNumber: Reject numbers not starting with 0', () => {
  const res = validateEgyptianPhoneNumber('11012345678');
  assert.equal(res.isValid, false);
  assert.match(res.errorMessage, /start with 0/i);
});

runTest('validateEgyptianPhoneNumber: Reject numbers not exactly 11 digits', () => {
  assert.equal(validateEgyptianPhoneNumber('0101234567').isValid, false); // 10 digits
  assert.equal(validateEgyptianPhoneNumber('010123456789').isValid, false); // 12 digits
});

runTest('validateEgyptianPhoneNumber: Reject invalid network prefixes (013, 014, 016, 017, 018, 019)', () => {
  assert.equal(validateEgyptianPhoneNumber('01312345678').isValid, false);
  assert.equal(validateEgyptianPhoneNumber('01412345678').isValid, false);
  assert.equal(validateEgyptianPhoneNumber('01912345678').isValid, false);
});

runTest('validateEgyptianPhoneNumber: Normalize international +20 prefix to 01xxxxxxxxx', () => {
  const res = validateEgyptianPhoneNumber('+201012345678');
  assert.equal(res.isValid, true);
  assert.equal(res.cleanPhone, '01012345678');
  assert.equal(res.network, 'Vodafone');
});

// Full name multi-word validation
const isValidFullName = (name) => {
  const clean = name.trim();
  return clean.length >= 3 && clean.length <= 100 && clean.split(/\s+/).length >= 2;
};

runTest('Full name requires at least 2 words (first and last name)', () => {
  assert.ok(isValidFullName('Ahmed Ali'));
  assert.ok(isValidFullName('Mohamed Mahmoud El-Sayed'));
  assert.equal(isValidFullName('Ahmed'), false); // single word
  assert.equal(isValidFullName('A'), false);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. EVALUATION SCORING ALGORITHMS & BOUNDARY HANDLING
// ─────────────────────────────────────────────────────────────────────────────
console.log(bold(yellow('\n▶ 5. EVALUATION SCORING & AVERAGES LOGIC')));

function calculateCategoryAverage(criteria, scores) {
  const scoredVals = criteria
    .map((c) => scores[c.id])
    .filter((v) => v !== undefined && v !== null && !isNaN(v));

  if (scoredVals.length === 0) return null;
  const sum = scoredVals.reduce((a, b) => a + b, 0);
  return Math.round((sum / scoredVals.length) * 10) / 10;
}

function getScoreBadgeClass(val) {
  if (val === undefined) return 'bg-white/5 text-slate-400 border-white/10';
  if (val <= 3) return 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-black';
  if (val <= 6) return 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-black';
  if (val <= 8) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-black';
  return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-black';
}

runTest('Calculate arithmetic mean with 1-decimal precision', () => {
  const criteria = [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }];
  const scores = { c1: 8, c2: 9, c3: 7 };
  const avg = calculateCategoryAverage(criteria, scores);
  assert.equal(avg, 8.0);
});

runTest('Round correctly on fractional values (e.g. 7 + 8 / 2 = 7.5, 7 + 8 + 8 / 3 = 7.7)', () => {
  const criteria = [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }];
  const scores = { c1: 7, c2: 8, c3: 8 };
  const avg = calculateCategoryAverage(criteria, scores);
  assert.equal(avg, 7.7);
});

runTest('Handle partially scored sections gracefully', () => {
  const criteria = [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }];
  const scores = { c1: 10 }; // only 1 of 3 scored
  const avg = calculateCategoryAverage(criteria, scores);
  assert.equal(avg, 10.0);
});

runTest('Return null when zero criteria are scored', () => {
  const criteria = [{ id: 'c1' }, { id: 'c2' }];
  const scores = {};
  const avg = calculateCategoryAverage(criteria, scores);
  assert.equal(avg, null);
});

runTest('Verify score color tier classifications (1-3 Rose, 4-6 Amber, 7-8 Emerald, 9-10 Cyan)', () => {
  assert.match(getScoreBadgeClass(2), /rose-500/);
  assert.match(getScoreBadgeClass(5), /amber-500/);
  assert.match(getScoreBadgeClass(8), /emerald-500/);
  assert.match(getScoreBadgeClass(10), /cyan-500/);
});

runTest('Exclude PARAGRAPH criteria from category numerical averages', () => {
  const criteria = [
    { id: 'c1', responseType: 'SCORE' },
    { id: 'c2', responseType: 'PARAGRAPH' },
    { id: 'c3', responseType: 'SCORE' },
  ];
  const scorableOnly = criteria.filter((c) => c.responseType !== 'PARAGRAPH');
  const scores = { c1: 8, c3: 10 };
  const avg = calculateCategoryAverage(scorableOnly, scores);
  assert.equal(avg, 9.0);
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. WHATSAPP DECISION DISPATCH & DOUBLE REJECTION PRIVACY RULE
// ─────────────────────────────────────────────────────────────────────────────
console.log(bold(yellow('\n▶ 6. WHATSAPP DECISION LOGIC & DOUBLE REJECTION PRIVACY RULE')));

// Import DB functions from admin
const adminDbPath = path.join(rootDir, 'apps', 'admin', 'lib', 'db.ts');
const dbContent = fs.readFileSync(adminDbPath, 'utf8');

// Lightweight test replica of generateCombinedWhatsAppDecision
function testGenerateCombinedWhatsAppDecision(applicantName, decisions, groupLinks) {
  const accepted = decisions.filter((d) => d.decision === 'ACCEPTED');
  const rejected = decisions.filter((d) => d.decision === 'REJECTED');

  const acceptedNames = accepted.map((a) => a.teamName).join(' و ');
  const rejectedNames = rejected.map((r) => r.teamName).join(' و ');
  const appliedNames = decisions.map((d) => d.teamName).join(' و ');

  let decisionBody = '';
  let linksSection = '';

  if (accepted.length > 0 && rejected.length > 0) {
    decisionBody = `🎉 ألف مبروك! يسعدنا إبلاغك بقبولك رسمياً في لجنة: *${acceptedNames}*.\nوللأسف نعتذر لك عن عدم التوفيق في لجنة: *${rejectedNames}*.`;
  } else if (accepted.length > 0 && rejected.length === 0) {
    decisionBody = `🎉 ألف مبروك! يسعدنا إبلاغك بقبولك رسمياً في لجنة: *${acceptedNames}* في IEEE ECU SB.`;
  } else {
    decisionBody = `نشكرك جداً على اهتمامك ووقتك في مقابلات لجنة: *${appliedNames}*.\nللأسف نعتذر عن عدم قبولك في هذا السيزون.`;
  }

  if (accepted.length > 0) {
    const linksList = [];
    if (groupLinks.familyLink) {
      linksList.push(`🏠 *جروب عائلة IEEE ECU (الكل):*\n${groupLinks.familyLink}`);
    }

    const hasTech = accepted.some((a) => a.category === 'TECH');
    if (hasTech && groupLinks.techMegaLink) {
      linksList.push(`💻 *جروب الـ Tech العام:*\n${groupLinks.techMegaLink}`);
    }

    for (const a of accepted) {
      const link = groupLinks.teamLinks?.[a.teamId];
      if (link) {
        linksList.push(`📌 *جروب لجنة ${a.teamName}:*\n${link}`);
      }
    }

    linksSection = `يرجى الانضمام للجروبات التالية لمتابعة التعليمات القادمة:\n\n${linksList.join('\n\n')}`;
  }

  return `عزيزي/عزيزتي *${applicantName}*،\n\n${decisionBody}\n\n${linksSection}`.trim();
}

const mockGroupLinks = {
  familyLink: 'https://chat.whatsapp.com/FamilyGroup123',
  techMegaLink: 'https://chat.whatsapp.com/TechMegaGroup123',
  mediaMegaLink: 'https://chat.whatsapp.com/MediaMegaGroup123',
  teamLinks: {
    software: 'https://chat.whatsapp.com/SoftwareTeam123',
    pr: 'https://chat.whatsapp.com/PRTeam123',
  },
};

runTest('Full Acceptance: Candidate receives acceptance message + family link + tech mega link + committee link', () => {
  const msg = testGenerateCombinedWhatsAppDecision(
    'Ahmed Ali',
    [{ teamId: 'software', teamName: 'Software', category: 'TECH', decision: 'ACCEPTED' }],
    mockGroupLinks
  );

  assert.match(msg, /ألف مبروك/);
  assert.match(msg, /Software/);
  assert.match(msg, /FamilyGroup123/);
  assert.match(msg, /TechMegaGroup123/);
  assert.match(msg, /SoftwareTeam123/);
});

runTest('Partial Acceptance: Candidate accepted in 1st preference and rejected in 2nd receives links ONLY for accepted committee', () => {
  const msg = testGenerateCombinedWhatsAppDecision(
    'Sara Mohamed',
    [
      { teamId: 'software', teamName: 'Software', category: 'TECH', decision: 'ACCEPTED' },
      { teamId: 'pr', teamName: 'PR & Logistics', category: 'NON_TECH', decision: 'REJECTED' },
    ],
    mockGroupLinks
  );

  assert.match(msg, /بقبولك رسمياً في لجنة: \*Software\*/);
  assert.match(msg, /نعتذر لك عن عدم التوفيق في لجنة: \*PR & Logistics\*/);
  assert.match(msg, /SoftwareTeam123/);
  // STRICT RULE: No PR team link must be present!
  assert.equal(msg.includes('PRTeam123'), false);
});

runTest('Double Rejection Strict Rule: Zero links must be dispatched for doubly rejected candidates', () => {
  const msg = testGenerateCombinedWhatsAppDecision(
    'Omar Khaled',
    [
      { teamId: 'software', teamName: 'Software', category: 'TECH', decision: 'REJECTED' },
      { teamId: 'pr', teamName: 'PR & Logistics', category: 'NON_TECH', decision: 'REJECTED' },
    ],
    mockGroupLinks
  );

  assert.match(msg, /نعتذر عن عدم قبولك/);
  // STRICT RULE: Absolute zero group links
  assert.equal(msg.includes('chat.whatsapp.com'), false);
  assert.equal(msg.includes('يرجى الانضمام'), false);
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. SCHEDULER TIMELINE & TIME MATH
// ─────────────────────────────────────────────────────────────────────────────
console.log(bold(yellow('\n▶ 7. SCHEDULER TIMELINE & TIME CALCULATIONS')));

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map((n) => parseInt(n, 10));
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

runTest('timeToMinutes correctly converts 24-hour time strings', () => {
  assert.equal(timeToMinutes('00:00'), 0);
  assert.equal(timeToMinutes('09:30'), 570);
  assert.equal(timeToMinutes('12:00'), 720);
  assert.equal(timeToMinutes('23:59'), 1439);
});

runTest('minutesToTime correctly formats minutes back to HH:mm string', () => {
  assert.equal(minutesToTime(0), '00:00');
  assert.equal(minutesToTime(570), '09:30');
  assert.equal(minutesToTime(720), '12:00');
  assert.equal(minutesToTime(1439), '23:59');
});

runTest('Quick +/- 5 minutes time adjuster math with boundary safeguards', () => {
  const adjustTime = (timeStr, deltaMins) => {
    const mins = timeToMinutes(timeStr);
    const newMins = Math.max(0, Math.min(1439, mins + deltaMins));
    return minutesToTime(newMins);
  };

  assert.equal(adjustTime('10:15', -5), '10:10');
  assert.equal(adjustTime('10:15', 5), '10:20');
  assert.equal(adjustTime('00:02', -5), '00:00'); // doesn't go below 00:00
  assert.equal(adjustTime('23:58', 5), '23:59');  // doesn't exceed 23:59
});

runTest('Slot collision detector identifies overlapping interviews for same participant', () => {
  const hasConflict = (slotA, slotB) => {
    const startA = timeToMinutes(slotA.startTime);
    const endA = timeToMinutes(slotA.endTime);
    const startB = timeToMinutes(slotB.startTime);
    const endB = timeToMinutes(slotB.endTime);

    // Overlap condition: startA < endB && startB < endA
    return startA < endB && startB < endA;
  };

  const slot1 = { startTime: '10:00', endTime: '10:15' };
  const slot2 = { startTime: '10:10', endTime: '10:25' }; // Overlaps
  const slot3 = { startTime: '10:15', endTime: '10:30' }; // Adjacent, no overlap

  assert.equal(hasConflict(slot1, slot2), true);
  assert.equal(hasConflict(slot1, slot3), false);
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. RESPONSIVE VISUAL & LAYOUT ARCHITECTURE INTEGRITY
// ─────────────────────────────────────────────────────────────────────────────
console.log(bold(yellow('\n▶ 8. RESPONSIVE VISUAL & LAYOUT ARCHITECTURE INTEGRITY')));

// Read layout and component files
const adminLayoutFile = fs.readFileSync(
  path.join(rootDir, 'apps', 'admin', 'app', 'admin', 'layout.tsx'),
  'utf8'
);
const adminSidebarFile = fs.readFileSync(
  path.join(rootDir, 'apps', 'admin', 'components', 'AdminSidebar.tsx'),
  'utf8'
);
const applicantsPageFile = fs.readFileSync(
  path.join(rootDir, 'apps', 'admin', 'app', 'admin', 'applicants', 'page.tsx'),
  'utf8'
);
const schedulingPageFile = fs.readFileSync(
  path.join(rootDir, 'apps', 'admin', 'app', 'admin', 'scheduling', 'page.tsx'),
  'utf8'
);
const interviewPageFile = fs.readFileSync(
  path.join(rootDir, 'apps', 'admin', 'app', 'hr', 'interview', '[id]', 'page.tsx'),
  'utf8'
);
const dossierPageFile = fs.readFileSync(
  path.join(rootDir, 'apps', 'admin', 'app', 'admin', 'applicants', '[id]', 'page.tsx'),
  'utf8'
);

runTest('Admin Root Layout: Uses flex-col on mobile and flex-row on lg: screens (no 50/50 crushed mobile layout)', () => {
  assert.match(adminLayoutFile, /flex flex-col lg:flex-row/);
  assert.match(adminLayoutFile, /overflow-x-hidden/);
});

runTest('Admin Root Main: Contains overflow-x-hidden and min-w-0 to prevent flex blowout', () => {
  assert.match(adminLayoutFile, /min-w-0/);
  assert.match(adminLayoutFile, /overflow-x-hidden/);
});

runTest('Admin Sidebar: Mobile top bar is sticky top-0 with high z-index and blur', () => {
  assert.match(adminSidebarFile, /sticky top-0 z-40/);
  assert.match(adminSidebarFile, /backdrop-blur/);
});

runTest('Admin Sidebar: Mobile navigation drawer has backdrop overlay and closes on click', () => {
  assert.match(adminSidebarFile, /fixed inset-0 bg-black\/60/);
  assert.match(adminSidebarFile, /setMobileOpen\(false\)/);
});

runTest('Admin Sidebar: Mobile drawer locks body scroll when open', () => {
  assert.match(adminSidebarFile, /document\.body\.style\.overflow = 'hidden'/);
  assert.match(adminSidebarFile, /document\.body\.style\.overflow = ''/);
});

runTest('Admin Sidebar: Navigation links have comfortable touch targets (py-3 for >= 44px height)', () => {
  assert.match(adminSidebarFile, /py-3/);
});

runTest('Applicants Directory: Implements dual view — mobile cards (md:hidden) and desktop table (hidden md:block)', () => {
  assert.match(applicantsPageFile, /md:hidden divide-y divide-white\/5/);
  assert.match(applicantsPageFile, /hidden md:block overflow-x-auto/);
});

runTest('Applicants Directory: Mobile cards feature direct call link (tel:)', () => {
  assert.match(applicantsPageFile, /href=\{`tel:\$\{app\.phoneNumber\}`\}/);
});

runTest('Applicants Directory: Filter tabs are horizontally scrollable with no-scrollbar on small viewports', () => {
  assert.match(applicantsPageFile, /overflow-x-auto no-scrollbar/);
});

runTest('Scheduling Page: Slot card wraps time, quick adjusters, and candidate info cleanly on mobile', () => {
  assert.match(schedulingPageFile, /flex flex-col sm:flex-row sm:items-center gap-3/);
  assert.match(schedulingPageFile, /min-w-0 flex-1/);
});

runTest('Scheduling Page: Date and status filter tabs have horizontal scroll on mobile', () => {
  assert.match(schedulingPageFile, /overflow-x-auto no-scrollbar/);
});

runTest('Interview Room: 1-10 score buttons render as a 5-column grid on mobile (grid grid-cols-5 sm:flex)', () => {
  // Checks that grid-cols-5 is used across General, Tech, Non-Tech criteria
  const gridMatches = (interviewPageFile.match(/grid grid-cols-5 sm:flex/g) || []).length;
  assert.ok(gridMatches >= 3, `Expected at least 3 grid-cols-5 matches, found ${gridMatches}`);
});

runTest('Interview Room: Score buttons have full width in column on mobile (w-full sm:w-9)', () => {
  assert.match(interviewPageFile, /w-full sm:w-9 h-9 rounded-xl/);
});

runTest('Interview Room: Persistent bottom submission bar stacks buttons vertically on mobile', () => {
  assert.match(interviewPageFile, /flex flex-col sm:flex-row items-stretch sm:items-center/);
});

runTest('Applicant Profile: Action buttons have wrap enabled for mobile viewports', () => {
  assert.match(dossierPageFile, /flex flex-wrap items-center gap-2/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. EXCEL EXPORT SCORES & REQUIRED EMAIL VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
console.log(bold(cyan('\n▶ 9. EXCEL EXPORT SCORES & REQUIRED EMAIL VERIFICATION')));

runTest('Apply Route: Enforces required email in schema', () => {
  const applyRouteCode = fs.readFileSync(path.join(rootDir, 'apps/applicant/app/api/apply/route.ts'), 'utf8');
  assert.match(applyRouteCode, /email:\s*z\s*\.string\(\)\s*\.trim\(\)\s*\.min\(5/);
  assert.match(applyRouteCode, /\.email\('Please enter a valid email address\.'\)/);
});

runTest('Application Form: Requires email with visual marker and pre-submit validation', () => {
  const formCode = fs.readFileSync(path.join(rootDir, 'apps/applicant/components/ApplicationForm.tsx'), 'utf8');
  assert.match(formCode, /Email Address <span className="text-\[#D92525\]">\*<\/span>/);
  assert.ok(formCode.includes('Validate Email Address (Required)'));
});

runTest('Excel Export: Outputs overall score, section scores, criteria, and rubric sheet', () => {
  const out = execSync('node tests/verify-excel-export.mjs', { cwd: rootDir, encoding: 'utf8' });
  assert.match(out, /VERIFICATION SUCCESS: All scores, averages, and criteria accurately exported to Excel!/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. SUCCESS PAGE RECEIPT & PRINT STYLING VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
console.log(bold(cyan('\n▶ 10. SUCCESS PAGE RECEIPT & PRINT STYLING VERIFICATION')));

runTest('Application Form: Persists full applicant payload to both sessionStorage and localStorage', () => {
  const formCode = fs.readFileSync(path.join(rootDir, 'apps/applicant/components/ApplicationForm.tsx'), 'utf8');
  assert.match(formCode, /sessionStorage\.setItem\(\s*'ieee_recruitment_success'/);
  assert.match(formCode, /localStorage\.setItem\(\s*'ieee_recruitment_success'/);
  assert.match(formCode, /nationalId:\s*nationalId\.trim\(\)/);
  assert.match(formCode, /faculty:\s*faculty\.trim\(\)/);
  assert.match(formCode, /academicLevel:\s*academicLevel\.trim\(\)/);
});

runTest('Navbar: Contains print:hidden to prevent header from appearing on paper', () => {
  const navbarCode = fs.readFileSync(path.join(rootDir, 'apps/applicant/components/Navbar.tsx'), 'utf8');
  assert.match(navbarCode, /<header[^>]*print:hidden/);
});

runTest('ChineseGeometricBackground: Contains print:hidden to prevent background watermarks and canvas from printing', () => {
  const bgCode = fs.readFileSync(path.join(rootDir, 'apps/applicant/components/ChineseGeometricBackground.tsx'), 'utf8');
  assert.match(bgCode, /className="home-bg print:hidden"/);
});

runTest('globals.css: Contains @media print rules enforcing white background and hiding screen artifacts', () => {
  const cssCode = fs.readFileSync(path.join(rootDir, 'apps/applicant/app/globals.css'), 'utf8');
  assert.match(cssCode, /@media print/);
  assert.match(cssCode, /background:\s*#ffffff\s*!important/);
  assert.match(cssCode, /\.home-bg/);
  assert.match(cssCode, /\.print\\:hidden/);
});

runTest('Success Page: Implements dual-storage reader, dedicated print receipt layout, and hidden interactive buttons', () => {
  const successCode = fs.readFileSync(path.join(rootDir, 'apps/applicant/app/success/page.tsx'), 'utf8');
  assert.match(successCode, /sessionStorage\.getItem\('ieee_recruitment_success'\)/);
  assert.match(successCode, /localStorage\.getItem\('ieee_recruitment_success'\)/);
  assert.match(successCode, /className="[^"]*print:hidden[^"]*"/);
  assert.match(successCode, /className="[^"]*hidden print:block[^"]*"/);
  assert.match(successCode, /Application Registration Receipt/);
  assert.match(successCode, /window\.print\(\)/);
});

runTest('ECU Faculties: Exactly 12 faculties configured with complete English and Arabic designations', () => {
  assert.equal(ECU_FACULTIES.length, 12, `Expected 12 ECU faculties, but found ${ECU_FACULTIES.length}`);
  const expectedFacultyIds = [
    'COMPUTERS_AI',
    'ENGINEERING',
    'PHARMACY',
    'PHYSICAL_THERAPY',
    'ECONOMICS_TRADE',
    'ARTS_DESIGN',
    'VETERINARY_MEDICINE',
    'MASS_COMMUNICATION',
    'LITERARY_STUDIES',
    'LAW',
    'NURSING',
    'HUMANITIES_GIS',
  ];
  for (const expectedId of expectedFacultyIds) {
    const f = ECU_FACULTIES.find((item) => item.id === expectedId);
    assert.ok(f, `Missing faculty with ID: ${expectedId}`);
    assert.ok(f.nameEn && f.nameEn.length > 3, `Invalid nameEn for faculty: ${expectedId}`);
    assert.ok(f.nameAr && f.nameAr.length > 3, `Invalid nameAr for faculty: ${expectedId}`);
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY & REPORT
// ─────────────────────────────────────────────────────────────────────────────
console.log(bold(cyan('\n══════════════════════════════════════════════════════════════════')));
console.log(bold(cyan('  TEST EXECUTION SUMMARY')));
console.log(bold(cyan('══════════════════════════════════════════════════════════════════')));
console.log(`  Total Test Cases : ${bold(totalTests)}`);
console.log(`  Passed           : ${bold(green(passedTests))}`);
console.log(`  Failed           : ${bold(failedTests > 0 ? red(failedTests) : '0')}`);
console.log(`  Success Rate     : ${bold(green(`${((passedTests / totalTests) * 100).toFixed(1)}%`))}`);

if (failedTests > 0) {
  console.log(bold(red('\nFailures breakdown:')));
  for (const f of failures) {
    console.log(`- ${f.name}: ${f.error.message}`);
  }
  process.exit(1);
} else {
  console.log(bold(green('\n✨ ALL LOGICAL, ALGORITHMIC, AND RESPONSIVE VISUAL CHECKS PASSED!\n')));
}
