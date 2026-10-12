/**
 * @file clean-db.mjs
 * @brief Test Database Reset Utility for IEEE ECU SB Recruitment Platform.
 * @details Safely flushes test applicants, schedules, reviews, and evaluation data
 *          while strictly preserving verified administrative accounts.
 * @author IEEE ECU Student Branch
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-supabase-service-role-key';

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function cleanDatabase() {
  console.log('--- CLEANING DATABASE WHILE STRICTLY PRESERVING ADMINS ---');

  // 1. Verify admins first
  const { data: admins, error: adminErr } = await supabase.from('admins').select('id, username, name');
  if (adminErr) {
    console.error('Error fetching admins:', adminErr);
    process.exit(1);
  }
  console.log(`Verified ${admins.length} admin accounts exist:`, admins.map(a => a.username));

  // 2. Tables to clean in reverse dependency order
  const tablesToClean = [
    'evaluation_scores',
    'evaluations',
    'interview_heads',
    'interview_schedules',
    'team_decisions',
    'applicant_reviews',
    'applicant_teams',
    'email_logs',
    'audit_logs',
    'head_availability',
    'hr_availability',
    'applicants',
  ];

  for (const table of tablesToClean) {
    const { error, count } = await supabase.from(table).delete({ count: 'exact' }).neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      console.warn(`Warning on deleting from ${table}:`, error.message);
    } else {
      console.log(`Deleted rows from ${table}: ${count ?? 'all'}`);
    }
  }

  // 3. Re-verify admins are 100% intact
  const { data: adminsAfter, error: verifyErr } = await supabase.from('admins').select('id, username, name');
  if (verifyErr) {
    console.error('Error verifying admins after cleanup:', verifyErr);
    process.exit(1);
  }
  console.log(`\nAdmins verification after wipe: ${adminsAfter?.length} accounts intact!`);
  for (const a of adminsAfter || []) {
    console.log(`  ✓ ${a.username} (${a.name})`);
  }

  // 4. Verify system configuration intact
  const { data: teams } = await supabase.from('teams').select('id, name');
  console.log(`Teams intact: ${teams?.length} committees`);

  const { data: criteria } = await supabase.from('evaluation_criteria').select('id, name');
  console.log(`Evaluation criteria intact: ${criteria?.length} criteria`);

  const { data: settings } = await supabase.from('system_settings').select('key');
  console.log(`System settings intact: ${settings?.map(s => s.key).join(', ')}`);
}

cleanDatabase();
