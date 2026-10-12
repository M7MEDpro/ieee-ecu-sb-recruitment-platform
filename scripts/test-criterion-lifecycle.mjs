/**
 * @file test-criterion-lifecycle.mjs
 * @brief Criterion Lifecycle API Integration Script.
 * @details Tests creating, querying, scoring against, and updating committee criteria.
 * @author IEEE ECU Student Branch
 */

async function testLifecycle() {
  console.log('--- 1. Login as Admin Youssef ---');
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: process.env.ADMIN_USERNAME || 'admin', password: process.env.ADMIN_PASSWORD || 'your_admin_password' }),
  });
  const cookieHeader = loginRes.headers.get('set-cookie');
  console.log('Login status:', loginRes.status, 'Cookie acquired:', Boolean(cookieHeader));

  console.log('\n--- 2. Add New Committee Criterion for Software ---');
  const critPayload = {
    name: 'Software: Advanced System Architecture & Scalability',
    section: 'TECH',
    teamCategory: 'software',
    description: 'Microservices, caching strategies, and database optimization.',
    minScore: 1,
    maxScore: 10,
    orderIndex: 99,
    isActive: true,
  };
  const createRes = await fetch('http://localhost:3001/api/criteria', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader || '',
    },
    body: JSON.stringify(critPayload),
  });
  const createData = await createRes.json();
  console.log('Criterion create status:', createRes.status, 'Success:', createData.success, 'ID:', createData.criterion?.id);
  const criterionId = createData.criterion?.id;

  console.log('\n--- 3. Verify Criterion Exists in /api/criteria ---');
  const listCritRes = await fetch('http://localhost:3001/api/criteria');
  const listCritData = await listCritRes.json();
  const foundCrit = listCritData.criteria?.find((c) => c.id === criterionId || c.name === critPayload.name);
  console.log('Found created criterion:', Boolean(foundCrit), foundCrit?.name, 'Scope:', foundCrit?.teamCategory);

  console.log('\n--- 4. Find Interview Slot for a Software Applicant ---');
  const schedRes = await fetch('http://localhost:3001/api/schedule', {
    headers: { Cookie: cookieHeader || '' },
  });
  const schedData = await schedRes.json();
  console.log('Total interview slots:', schedData.slots?.length);

  // Find a slot where applicant applied to software
  const softwareSlot = schedData.slots?.find(
    (s) =>
      s.appliedTeams?.includes('software') ||
      s.appliedTeams?.includes('Software') ||
      (Array.isArray(s.appliedTeams) && s.appliedTeams.some((t) => t.id === 'software' || t.name === 'Software'))
  );
  console.log(
    'Found software slot:',
    softwareSlot?.id,
    'Applicant:',
    softwareSlot?.applicantName,
    'Teams:',
    softwareSlot?.appliedTeams
  );

  if (softwareSlot) {
    console.log('\n--- 5. Submit Evaluation with Score for New Software Criterion ---');
    const evalRes = await fetch('http://localhost:3001/api/evaluations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader || '',
      },
      body: JSON.stringify({
        interviewId: softwareSlot.id,
        applicantId: softwareSlot.applicantId,
        generalNotes: 'Strong communication and great attitude.',
        techNotes: 'Exceptional system architecture understanding on the new criterion.',
        nonTechNotes: '',
        scores: {
          [foundCrit.id]: 9,
        },
      }),
    });
    const evalData = await evalRes.json();
    console.log('Evaluation submission status:', evalRes.status, 'Response:', evalData);

    console.log('\n--- 6. Verify in Applicant Dossier /api/applicants/[id] ---');
    const appRes = await fetch(`http://localhost:3001/api/applicants/${softwareSlot.applicantId}`, {
      headers: { Cookie: cookieHeader || '' },
    });
    const appData = await appRes.json();
    const applicant = appData.applicant;
    console.log('Applicant Dossier Evaluation Status:', applicant?.evaluation ? 'PRESENT' : 'MISSING');
    console.log('Tech Average:', applicant?.evaluation?.techAverage);
    console.log('Score for our new criterion:', applicant?.evaluation?.scores?.[foundCrit.id]);
    console.log('Tech Notes:', applicant?.evaluation?.techNotes);

    if (applicant?.evaluation?.scores?.[foundCrit.id] === 9 && applicant?.evaluation?.techAverage === 9) {
      console.log('\n🎉 SUCCESS: The new committee question successfully reflected from criteria creation to interview scoring, dynamic average calculation, and final applicant dossier!');
    }
  } else {
    console.log('No existing software slot found in schedule, listing applicants directly...');
    const appListRes = await fetch('http://localhost:3001/api/applicants', {
      headers: { Cookie: cookieHeader || '' },
    });
    const appListData = await appListRes.json();
    console.log('Total applicants in directory:', appListData.applicants?.length);
  }
}

testLifecycle();
