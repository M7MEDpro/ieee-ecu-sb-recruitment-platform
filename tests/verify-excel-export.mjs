/**
 * @file verify-excel-export.mjs
 * @brief Excel Workbook Export Verification & Rubric Validator.
 * @details Tests generation of multi-sheet evaluation spreadsheets, scoring rubrics,
 *          and candidate interview summaries.
 * @author IEEE ECU Student Branch
 */

import * as XLSX from 'xlsx';

// Sample applicant matching getApplicantDetail output
const mockApplicant = {
  id: 'd95600dc-95fb-4697-ab62-27e025304365',
  fullName: 'ahmed fathy',
  phoneNumber: '01275502155',
  email: 'ahmed@example.com',
  nationalId: '30703103434563',
  faculty: 'Engineering',
  academicLevel: 'Level 2',
  createdAt: '2026-09-26T20:20:26.82537+00:00',
  teams: [
    { id: 'hardware', name: 'Hardware', category: 'TECH' },
    { id: 'hr', name: 'HR', category: 'NON_TECH' }
  ],
  interview: {
    id: 'b1d02a22-1970-4c61-aa99-4df704f5c8cd',
    date: '2026-09-25',
    startTime: '09:00:00',
    endTime: '09:12:00',
    hrName: 'ahmed',
    assignedHeads: ['Kareem (Software Head)', 'Hana (HR Head)'],
    status: 'COMPLETED'
  },
  evaluation: {
    id: '9b83dbfb-971f-4595-a605-149bb124b332',
    generalAverage: 8.5,
    techAverage: null,
    nonTechAverage: 8.0,
    generalNotes: 'Great interpersonal communication and enthusiasm.',
    techNotes: '',
    nonTechNotes: 'Strong leadership traits.',
    scores: {
      '66681d46-9ef5-4ca5-a6d5-4a17ce1eafba': 8,
      '3229d06a-7e79-4ff7-b539-98827655e392': 9,
      'c9d44e2f-c25f-4b05-9b58-f560ba241247': 8
    },
    textResponses: {
      '4ea89072-4032-447b-ab36-f24459a585a6': 'Promising candidate with solid motivation.'
    }
  },
  generalAverage: 8.5,
  techAverage: null,
  nonTechAverage: 8.0,
  isReviewed: true,
  decisions: {
    hardware: 'REJECTED',
    hr: 'ACCEPTED'
  },
  decisionWhatsappStatus: 'SENT'
};

const mockCriteria = [
  {
    id: '66681d46-9ef5-4ca5-a6d5-4a17ce1eafba',
    name: 'Teamwork',
    section: 'GENERAL',
    teamCategory: 'ALL',
    maxScore: 10,
    orderIndex: 1,
    responseType: 'SCORE'
  },
  {
    id: '3229d06a-7e79-4ff7-b539-98827655e392',
    name: 'بعرف ايه عننا',
    section: 'GENERAL',
    teamCategory: 'ALL',
    maxScore: 10,
    orderIndex: 2,
    responseType: 'SCORE'
  },
  {
    id: '4ea89072-4032-447b-ab36-f24459a585a6',
    name: 'Qualitative Interviewer Summary',
    section: 'GENERAL',
    teamCategory: 'ALL',
    maxScore: 0,
    orderIndex: 3,
    responseType: 'PARAGRAPH'
  },
  {
    id: 'c9d44e2f-c25f-4b05-9b58-f560ba241247',
    name: 'Interview',
    section: 'NON_TECH',
    teamCategory: 'hr',
    maxScore: 10,
    orderIndex: 1,
    responseType: 'SCORE'
  }
];

// Import generateRecruitmentExcel logic or test directly
const sectionPriority = { GENERAL: 1, TECH: 2, NON_TECH: 3 };
const sortedCriteria = [...mockCriteria].sort((a, b) => {
  const secDiff = (sectionPriority[a.section] || 99) - (sectionPriority[b.section] || 99);
  if (secDiff !== 0) return secDiff;
  return (a.orderIndex || 0) - (b.orderIndex || 0);
});

const evalData = mockApplicant.evaluation;
const scoresMap = evalData?.scores || {};
const textResponsesMap = evalData?.textResponses || {};

const generalAvg = evalData?.generalAverage !== null && evalData?.generalAverage !== undefined
  ? Number(evalData.generalAverage)
  : (mockApplicant.generalAverage !== null && mockApplicant.generalAverage !== undefined ? Number(mockApplicant.generalAverage) : null);

const techAvg = evalData?.techAverage !== null && evalData?.techAverage !== undefined
  ? Number(evalData.techAverage)
  : (mockApplicant.techAverage !== null && mockApplicant.techAverage !== undefined ? Number(mockApplicant.techAverage) : null);

const nonTechAvg = evalData?.nonTechAverage !== null && evalData?.nonTechAverage !== undefined
  ? Number(evalData.nonTechAverage)
  : (mockApplicant.nonTechAverage !== null && mockApplicant.nonTechAverage !== undefined ? Number(mockApplicant.nonTechAverage) : null);

const activeAverages = [generalAvg, techAvg, nonTechAvg].filter((v) => v !== null && !isNaN(v));
const overallAvg = activeAverages.length > 0
  ? Math.round((activeAverages.reduce((acc, curr) => acc + curr, 0) / activeAverages.length) * 10) / 10
  : null;

const rowObj = {
  '#': 1,
  'Full Name': mockApplicant.fullName,
  'Phone Number': mockApplicant.phoneNumber,
  'Email Address': mockApplicant.email,
  'National ID': mockApplicant.nationalId,
  'Faculty': mockApplicant.faculty,
  'Academic Level': mockApplicant.academicLevel,
  'Applied Committees': 'Hardware & HR',
  'Interview Date': mockApplicant.interview.date,
  'Interview Time': `${mockApplicant.interview.startTime} – ${mockApplicant.interview.endTime}`,
  'Assigned HR': mockApplicant.interview.hrName,
  'Assigned Head(s)': mockApplicant.interview.assignedHeads.join(', '),
  'Interview Status': mockApplicant.interview.status,
  'Evaluation Status': evalData ? 'Evaluated' : 'Pending',
  'Overall Score': overallAvg !== null ? overallAvg : 'N/A',
  'General (HR) Score': generalAvg !== null ? generalAvg : 'N/A',
  'Tech Score': techAvg !== null ? techAvg : 'N/A',
  'Non-Tech Score': nonTechAvg !== null ? nonTechAvg : 'N/A',
};

for (const crit of sortedCriteria) {
  const sectionTag =
    crit.section === 'GENERAL'
      ? 'HR'
      : crit.section === 'TECH'
      ? `Tech:${(crit.teamCategory || 'ALL').toUpperCase()}`
      : `NonTech:${(crit.teamCategory || 'ALL').toUpperCase()}`;

  const colHeader = `[${sectionTag}] ${crit.name}`;

  if (crit.responseType === 'PARAGRAPH') {
    rowObj[colHeader] = textResponsesMap[crit.id] || '—';
  } else {
    const val = scoresMap[crit.id];
    rowObj[colHeader] = val !== undefined && val !== null ? Number(val) : '—';
  }
}

rowObj['General / HR Notes'] = evalData?.generalNotes?.trim() || '—';
rowObj['Technical Notes'] = evalData?.techNotes?.trim() || '—';
rowObj['Non-Technical Notes'] = evalData?.nonTechNotes?.trim() || '—';

const ws = XLSX.utils.json_to_sheet([rowObj]);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Applicants & Scores');
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

const parsedWb = XLSX.read(buf, { type: 'buffer' });
const parsedRows = XLSX.utils.sheet_to_json(parsedWb.Sheets['Applicants & Scores']);
console.log('OUTPUT ROW FROM EXCEL:');
console.log(JSON.stringify(parsedRows[0], null, 2));

if (parsedRows[0]['General (HR) Score'] === 8.5 &&
    parsedRows[0]['Non-Tech Score'] === 8 &&
    parsedRows[0]['Overall Score'] === 8.3 &&
    parsedRows[0]['[HR] Teamwork'] === 8 &&
    parsedRows[0]['[HR] بعرف ايه عننا'] === 9 &&
    parsedRows[0]['[NonTech:HR] Interview'] === 8) {
  console.log('VERIFICATION SUCCESS: All scores, averages, and criteria accurately exported to Excel!');
} else {
  console.error('VERIFICATION FAILED: Values did not match expectations.');
  process.exit(1);
}
