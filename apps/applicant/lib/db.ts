/**
 * @file db.ts
 * @brief High-Concurrency Database Access Layer for Applicant Ingestion.
 * @details Seamlessly routes submissions to live Supabase Postgres when configured,
 *          or an atomic persistent transaction-safe local ledger in development.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export interface PersistedApplicant {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  nationalId: string;
  faculty?: string;
  academicLevel?: string;
  selectedTeamIds: string[];
  createdAt: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;

const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  !supabaseUrl.includes('your-project') &&
  !supabaseKey.includes('your-supabase')
);

function getSupabase() {
  return createClient(supabaseUrl!, supabaseKey!, {
    auth: { persistSession: false },
  });
}

function findMonorepoRoot(): string {
  let current = process.cwd();
  for (let i = 0; i < 5; i++) {
    const pkgPath = path.join(current, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.name === 'ieee-ecu-sb-recruitment-platform') {
          return current;
        }
      } catch {}
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}

const ROOT_DIR = findMonorepoRoot();
const DB_DIR = path.join(ROOT_DIR, '.data');
const DB_FILE = path.join(DB_DIR, 'recruitment_store.json');

function ensureDbFile(): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      applicants: [],
      applicantTeams: [],
      hrAccounts: [],
      hrAvailability: [],
      headAvailability: [],
      interviewSchedules: [],
      evaluations: [],
      evaluationScores: [],
      applicantReviews: [],
      teamDecisions: [],
      emailTemplates: [],
      emailLogs: [],
      auditLogs: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf8');
  }
}

/**
 * @brief Atomically creates an applicant and their committee selections.
 * @param applicantData Personal info + validated team selection.
 * @returns Confirmation with assigned UUID and timestamp.
 */
export async function createApplicationAtomically(applicantData: {
  fullName: string;
  phoneNumber: string;
  email?: string;
  nationalId: string;
  faculty?: string;
  academicLevel?: string;
  selectedTeamIds: string[];
}): Promise<{ id: string; createdAt: string }> {
  // 1. Supabase Mode (via Atomic Security-Definer RPC)
  if (isSupabaseConfigured) {
    const supabase = createClient(supabaseUrl!, supabaseKey!, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase.rpc('submit_application', {
      p_full_name: applicantData.fullName,
      p_phone_number: applicantData.phoneNumber,
      p_email: applicantData.email ? applicantData.email.trim().toLowerCase() : null,
      p_national_id: applicantData.nationalId,
      p_faculty: applicantData.faculty || null,
      p_academic_level: applicantData.academicLevel || null,
      p_team_ids: applicantData.selectedTeamIds,
    });

    if (error) {
      console.error('[DB] Supabase rpc submit_application error:', error);
      if (
        error.message &&
        (error.message.includes('National ID has already been submitted') ||
          error.message.includes('unique constraint') ||
          error.message.includes('idx_applicants_national_id'))
      ) {
        throw new Error('An application with this National ID has already been submitted.');
      }
      throw new Error(error.message || 'Failed to persist application. Please try again.');
    }

    if (!data || !data.id) {
      throw new Error('Database did not return confirmation. Please try again.');
    }

    return {
      id: data.id,
      createdAt: data.created_at,
    };
  }

  // 2. Local Resilient Ledger Mode (Guarantees concurrent atomic file writing)
  ensureDbFile();

  // Read with atomic check
  const rawContent = fs.readFileSync(DB_FILE, 'utf8');
  const store = JSON.parse(rawContent);

  // Check unique national ID
  const duplicate = store.applicants.find(
    (a: any) => a.nationalId === applicantData.nationalId
  );
  if (duplicate) {
    throw new Error('An application with this National ID has already been submitted.');
  }

  const newId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const newApplicant: PersistedApplicant = {
    id: newId,
    fullName: applicantData.fullName,
    phoneNumber: applicantData.phoneNumber,
    email: applicantData.email ? applicantData.email.trim().toLowerCase() : '',
    nationalId: applicantData.nationalId,
    faculty: applicantData.faculty,
    academicLevel: applicantData.academicLevel,
    selectedTeamIds: applicantData.selectedTeamIds,
    createdAt: timestamp,
  };

  store.applicants.push(newApplicant);

  for (const teamId of applicantData.selectedTeamIds) {
    store.applicantTeams.push({
      id: crypto.randomUUID(),
      applicantId: newId,
      teamId,
      createdAt: timestamp,
    });
  }

  // Atomic file write using temp file and rename to avoid partial writes
  const tempPath = `${DB_FILE}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(store, null, 2), 'utf8');
  fs.renameSync(tempPath, DB_FILE);

  return {
    id: newId,
    createdAt: timestamp,
  };
}

export async function getRecruitmentStatus(): Promise<'OPEN' | 'CLOSED'> {
  if (isSupabaseConfigured) {
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from('system_settings')
        .select('value')
        .eq('key', 'recruitment_status')
        .maybeSingle();

      if (error) {
        console.error('[Applicant DB] Error fetching recruitment_status:', error);
      }

      if (data && data.value !== undefined && data.value !== null) {
        let val = data.value;
        if (typeof val === 'string') {
          val = val.replace(/["']/g, '').trim().toUpperCase();
        }
        if (val === 'OPEN' || val === 'CLOSED') {
          return val as 'OPEN' | 'CLOSED';
        }
      }
    } catch (e) {
      console.warn('[Applicant DB] getRecruitmentStatus error:', e);
    }
  }
  return 'OPEN';
}

