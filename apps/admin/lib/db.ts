/**
 * @file db.ts
 * @brief Master Data Access Layer for IEEE ECU SB Recruitment Governance.
 * @details Seamlessly connects to live Supabase Postgres or an atomic local
 *          persistent ACID store in /tmp or .data. Ensures zero downtime,
 *          schema parity, and complete auditability.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import bcrypt from 'bcryptjs';
import {
  TEAMS,
  findTeam,
  TeamDefinition,
  HRAccount,
  HRAvailabilityWindow,
  HeadAvailabilityWindow,
  InterviewScheduleSlot,
  EvaluationCriterion,
  EvaluationSectionType,
  EvaluationSubmission,
  TeamDecisionRecord,
  EmailTemplate,
  EmailLog,
  ApplicantWithTeams,
  WhatsAppGroupLinks,
  VenueDefinition,
  WhatsAppTemplate,
  WhatsAppMessageType,
  DecisionStatus,
  RecruitmentStatus,
  CommitteeQuota,
  extractFirstName,
  formatTimeString12h,
} from '@ieee-recruitment/shared';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseServiceKey &&
  !supabaseUrl.includes('your-project') &&
  !supabaseServiceKey.includes('your-supabase')
);

let _cachedSupabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!_cachedSupabaseClient) {
    _cachedSupabaseClient = createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: { persistSession: false },
    });
  }
  return _cachedSupabaseClient;
}

// In-Memory Fast Cache with automatic expiration & instant invalidation on writes
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const MEMORY_CACHE = new Map<string, CacheEntry<any>>();

export function getCached<T>(key: string, ttlMs: number = 20000): T | null {
  const entry = MEMORY_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttlMs) {
    MEMORY_CACHE.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCached<T>(key: string, data: T): void {
  MEMORY_CACHE.set(key, { data, timestamp: Date.now() });
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    MEMORY_CACHE.clear();
    return;
  }
  for (const key of Array.from(MEMORY_CACHE.keys())) {
    if (key.startsWith(prefix)) {
      MEMORY_CACHE.delete(key);
    }
  }
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
const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DB_DIR = isVercel ? path.join(os.tmpdir(), 'ieee_data') : path.join(ROOT_DIR, '.data');
const DB_FILE = path.join(DB_DIR, 'recruitment_store.json');

function ensureDbFile(): void {
  if (!fs.existsSync(DB_DIR)) {
    try {
      fs.mkdirSync(DB_DIR, { recursive: true });
    } catch (e) {
      console.warn('[DB] mkdir error fallback:', e);
    }
  }
  if (!fs.existsSync(DB_FILE)) {
    const defaultAdminPassword = process.env.ADMIN_PASSWORD || 'Admin#Default2026!';
    const defaultHrPassword = process.env.DEFAULT_HR_PASSWORD || 'HR#Default2026!';
    const adminPassHash = bcrypt.hashSync(defaultAdminPassword, 10);
    const initialData = {
      admins: [
        {
          id: 'a0000000-0000-0000-0000-000000000001',
          username: 'admin',
          name: 'Executive Administrator',
          passwordHash: adminPassHash,
        },
      ],
      hrAccounts: [
        {
          id: 'hr-001',
          name: 'Sarah HR',
          passwordHash: bcrypt.hashSync(defaultHrPassword, 10),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'hr-002',
          name: 'Omar HR',
          passwordHash: bcrypt.hashSync(defaultHrPassword, 10),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      applicants: [],
      applicantTeams: [],
      hrAvailability: [
        {
          id: 'hr-avail-1',
          hrId: 'hr-001',
          date: '2026-09-25',
          startTime: '09:00',
          endTime: '15:00',
          isAvailable: true,
        },
        {
          id: 'hr-avail-2',
          hrId: 'hr-002',
          date: '2026-09-25',
          startTime: '09:00',
          endTime: '15:00',
          isAvailable: true,
        },
      ],
      headAvailability: [
        {
          id: 'head-avail-1',
          headName: 'Kareem (Software Head)',
          headCategory: 'TECH_HEAD',
          date: '2026-09-25',
          startTime: '09:00',
          endTime: '15:00',
          isAvailable: true,
        },
        {
          id: 'head-avail-2',
          headName: 'Nour (Media Head)',
          headCategory: 'MEDIA_HEAD',
          date: '2026-09-25',
          startTime: '09:00',
          endTime: '15:00',
          isAvailable: true,
        },
        {
          id: 'head-avail-3',
          headName: 'Youssef (PR Head)',
          headCategory: 'PR_HEAD',
          date: '2026-09-25',
          startTime: '09:00',
          endTime: '15:00',
          isAvailable: true,
        },
        {
          id: 'head-avail-4',
          headName: 'Salma (Events Head)',
          headCategory: 'EVENTS_HEAD',
          date: '2026-09-25',
          startTime: '09:00',
          endTime: '15:00',
          isAvailable: true,
        },
        {
          id: 'head-avail-5',
          headName: 'Hana (HR Head)',
          headCategory: 'HR_HEAD',
          date: '2026-09-25',
          startTime: '09:00',
          endTime: '15:00',
          isAvailable: true,
        },
      ],
      interviewSchedules: [],
      interviewHeads: [],
      evaluationCriteria: [
        {
          id: 'crit-gen-1',
          name: 'Communication & Articulation',
          section: 'GENERAL',
          teamCategory: 'ALL',
          description: 'Clarity of thought, active listening, and concise verbal expression',
          minScore: 1,
          maxScore: 10,
          orderIndex: 1,
          isActive: true,
        },
        {
          id: 'crit-gen-2',
          name: 'Commitment & Availability',
          section: 'GENERAL',
          teamCategory: 'ALL',
          description: 'Dedication to season deadlines, university workload balance, and attendance',
          minScore: 1,
          maxScore: 10,
          orderIndex: 2,
          isActive: true,
        },
        {
          id: 'crit-gen-3',
          name: 'Teamwork & Culture Fit',
          section: 'GENERAL',
          teamCategory: 'ALL',
          description: 'Collaborative attitude, peer respect, ego management, and enthusiasm',
          minScore: 1,
          maxScore: 10,
          orderIndex: 3,
          isActive: true,
        },
        {
          id: 'crit-gen-4',
          name: 'Critical Thinking & Adaptability',
          section: 'GENERAL',
          teamCategory: 'ALL',
          description: 'Ability to think on their feet when faced with unexpected constraints',
          minScore: 1,
          maxScore: 10,
          orderIndex: 4,
          isActive: true,
        },
        {
          id: 'crit-gen-5',
          name: 'Qualitative Interviewer Summary',
          section: 'GENERAL',
          teamCategory: 'ALL',
          description: 'Free-form paragraph for qualitative interview notes, flags, impressions, and recommendations.',
          responseType: 'PARAGRAPH',
          minScore: 0,
          maxScore: 0,
          orderIndex: 5,
          isActive: true,
        },
        {
          id: 'crit-tech-1',
          name: 'Fundamental Technical Knowledge',
          section: 'TECH',
          teamCategory: 'ALL',
          description: 'Core concepts relevant to the applicant technological domain',
          minScore: 1,
          maxScore: 10,
          orderIndex: 10,
          isActive: true,
        },
        {
          id: 'crit-tech-2',
          name: 'Problem Solving & Logic',
          section: 'TECH',
          teamCategory: 'ALL',
          description: 'Structured problem deconstruction and algorithmic thought process',
          minScore: 1,
          maxScore: 10,
          orderIndex: 11,
          isActive: true,
        },
        {
          id: 'crit-tech-3',
          name: 'Software Development Proficiency',
          section: 'TECH',
          teamCategory: 'software',
          description: 'Familiarity with clean code, version control, and frontend/backend principles',
          minScore: 1,
          maxScore: 10,
          orderIndex: 12,
          isActive: true,
        },
        {
          id: 'crit-tech-4',
          name: 'Hardware Circuit Architecture',
          section: 'TECH',
          teamCategory: 'hardware',
          description: 'Schematic analysis, microcontrollers, embedded C/C++, and hardware testing',
          minScore: 1,
          maxScore: 10,
          orderIndex: 13,
          isActive: true,
        },
        {
          id: 'crit-tech-5',
          name: 'Prototype Innovation & Research',
          section: 'TECH',
          teamCategory: 'general-tech',
          description: 'Cross-discipline prototyping, rapid iteration, and technical curiosity',
          minScore: 1,
          maxScore: 10,
          orderIndex: 14,
          isActive: true,
        },
        {
          id: 'crit-non-1',
          name: 'PR Negotiation & Etiquette',
          section: 'NON_TECH',
          teamCategory: 'pr-logistics',
          description: 'Persuasiveness, professional composure, and sponsorship negotiation confidence',
          minScore: 1,
          maxScore: 10,
          orderIndex: 20,
          isActive: true,
        },
        {
          id: 'crit-non-2',
          name: 'Logistics Procurement & Planning',
          section: 'NON_TECH',
          teamCategory: 'pr-logistics',
          description: 'Supply management, venue coordination, and execution readiness',
          minScore: 1,
          maxScore: 10,
          orderIndex: 21,
          isActive: true,
        },
        {
          id: 'crit-non-3',
          name: 'Event Staging & Crowd Engagement',
          section: 'NON_TECH',
          teamCategory: 'events',
          description: 'Agenda coordination, speaker hospitality, and crisis management',
          minScore: 1,
          maxScore: 10,
          orderIndex: 22,
          isActive: true,
        },
        {
          id: 'crit-non-4',
          name: 'Emotional Intelligence & Mediation',
          section: 'NON_TECH',
          teamCategory: 'hr',
          description: 'Active listening, empathy, conflict mediation, and member bonding',
          minScore: 1,
          maxScore: 10,
          orderIndex: 23,
          isActive: true,
        },
        {
          id: 'crit-non-5',
          name: 'Cinematography & Video Editing',
          section: 'NON_TECH',
          teamCategory: 'visuals',
          description: 'Camera operation, lighting, pacing, sound design, and timeline editing',
          minScore: 1,
          maxScore: 10,
          orderIndex: 24,
          isActive: true,
        },
        {
          id: 'crit-non-6',
          name: 'Graphic Hierarchy & Branding',
          section: 'NON_TECH',
          teamCategory: 'graphics',
          description: 'Typography, color harmony, composition, and brand asset fluency',
          minScore: 1,
          maxScore: 10,
          orderIndex: 25,
          isActive: true,
        },
        {
          id: 'crit-non-7',
          name: 'Marketing Copy & Campaign Strategy',
          section: 'NON_TECH',
          teamCategory: 'marketing',
          description: 'Copywriting, storytelling, social trends, and outreach strategy',
          minScore: 1,
          maxScore: 10,
          orderIndex: 26,
          isActive: true,
        },
      ],
      evaluations: [],
      evaluationScores: [],
      applicantReviews: [],
      teamDecisions: [],
      emailTemplates: [
        {
          id: 'INTERVIEW',
          subject: 'Interview Invitation — IEEE ECU Student Branch | {{team}}',
          bodyHtml: `<div style="font-family: Arial, sans-serif; background-color: #023260; color: #ffffff; padding: 30px; border-radius: 12px;">
  <h2 style="color: #00a1c0; margin-top: 0;">Hello {{name}},</h2>
  <p>Thank you for applying to join <strong>IEEE ECU Student Branch</strong>!</p>
  <p>We are delighted to invite you for your official recruitment interview for <strong>{{team}}</strong>.</p>
  <p>Please note: You will receive <strong>ONE unified interview</strong> covering your applied committees.</p>
  <p style="margin-top: 25px;">Best regards,<br>IEEE ECU Student Branch High Board</p>
</div>`,
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'ACCEPTANCE',
          subject: 'Congratulations! Welcome to IEEE ECU Student Branch | {{team}}',
          bodyHtml: `<div style="font-family: Arial, sans-serif; background-color: #023260; color: #ffffff; padding: 30px; border-radius: 12px;">
  <h2 style="color: #10b981; margin-top: 0;">Congratulations, {{name}}!</h2>
  <p>We are thrilled to officially welcome you to the <strong>IEEE ECU Student Branch</strong> family!</p>
  <p>You have been accepted into committee: <strong style="color: #10b981;">{{team}}</strong>.</p>
  <p>Our onboarding session details will be sent shortly. Welcome aboard!</p>
  <p style="margin-top: 25px;">Best regards,<br>IEEE ECU Student Branch High Board</p>
</div>`,
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'REJECTION',
          subject: 'Update Regarding Your IEEE ECU Student Branch Application | {{team}}',
          bodyHtml: `<div style="font-family: Arial, sans-serif; background-color: #023260; color: #ffffff; padding: 30px; border-radius: 12px;">
  <h2 style="color: #94a3b8; margin-top: 0;">Dear {{name}},</h2>
  <p>Thank you for your interest in joining <strong>IEEE ECU Student Branch</strong> for committee <strong>{{team}}</strong>.</p>
  <p>Due to high application volume and limited capacity, we are unable to offer you a position in this committee for the current season.</p>
  <p>We sincerely appreciate your effort and invite you to attend our open public workshops and events.</p>
  <p style="margin-top: 25px;">Best regards,<br>IEEE ECU Student Branch High Board</p>
</div>`,
          updatedAt: new Date().toISOString(),
        },
      ],
      emailLogs: [],
      auditLogs: [],
    };
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf8');
    } catch (e) {
      console.warn('[DB] write initialData error fallback:', e);
    }
  }
}

function readStore(): any {
  ensureDbFile();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return {
      admins: [],
      hrAccounts: [],
      applicants: [],
      applicantTeams: [],
      hrAvailability: [],
      headAvailability: [],
      interviewSchedules: [],
      interviewHeads: [],
      evaluationCriteria: [],
      evaluations: [],
      evaluationScores: [],
      applicantReviews: [],
      teamDecisions: [],
      emailTemplates: [],
      emailLogs: [],
      auditLogs: [],
    };
  }
}

function writeStore(store: any): void {
  ensureDbFile();
  try {
    const tempPath = `${DB_FILE}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(store, null, 2), 'utf8');
    fs.renameSync(tempPath, DB_FILE);
  } catch (e) {
    console.warn('[DB] writeStore error fallback:', e);
  }
}

// ── ADMIN & AUTHENTICATION ──────────────────────────────────────────

export async function findAdminByUsername(username: string): Promise<any | null> {
  const sb = getSupabase();
  if (sb) {
    try {
      // 1. Try secure RPC function (works under both anon and service_role with SECURITY DEFINER)
      const { data: rpcData, error: rpcErr } = await sb.rpc('get_admin_credentials', {
        p_username: username.trim(),
      });
      if (!rpcErr && rpcData && rpcData.length > 0) {
        const item = rpcData[0];
        return {
          id: item.id,
          username: item.username,
          name: item.name,
          passwordHash: item.password_hash,
        };
      }

      // 2. Direct select fallback (requires service_role)
      const { data } = await sb
        .from('admins')
        .select('*')
        .or(`username.ilike.${username.trim()},name.ilike.%${username.trim()}%`)
        .maybeSingle();
      if (data) {
        return {
          id: data.id,
          username: data.username,
          name: data.name,
          passwordHash: data.password_hash,
        };
      }
    } catch (e) {
      console.warn('[DB:Supabase] findAdminByUsername error, falling back:', e);
    }
  }

  const store = readStore();
  const lower = username.toLowerCase();
  return (
    store.admins?.find(
      (a: any) =>
        a.username?.toLowerCase() === lower || a.name?.toLowerCase().includes(lower)
    ) || null
  );
}

export async function findHRByName(name: string): Promise<HRAccount | null> {
  if (name.trim().toLowerCase().includes('amar')) {
    return null;
  }

  const sb = getSupabase();
  if (sb) {
    try {
      // 1. Try secure RPC function
      const { data: rpcData, error: rpcErr } = await sb.rpc('get_hr_credentials', {
        p_name: name.trim(),
      });
      if (!rpcErr && rpcData && rpcData.length > 0) {
        const item = rpcData[0];
        if (item.name?.toLowerCase().includes('amar')) return null;
        return {
          id: item.id,
          name: item.name,
          passwordHash: item.password_hash,
          role: 'HR' as const,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        };
      }

      // 2. Direct select fallback
      const { data } = await sb
        .from('hr_accounts')
        .select('*')
        .ilike('name', name.trim())
        .maybeSingle();
      if (data) {
        if (data.name?.toLowerCase().includes('amar')) return null;
        return {
          id: data.id,
          name: data.name,
          passwordHash: data.password_hash,
          role: 'HR' as const,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
      return null;
    } catch (e) {
      console.warn('[DB:Supabase] findHRByName error, falling back:', e);
    }
  }

  const store = readStore();
  const hr = store.hrAccounts?.find((h: any) => h.name?.toLowerCase() === name.toLowerCase());
  if (hr && hr.name?.toLowerCase().includes('amar')) return null;
  return hr || null;
}

export function cleanHRName(rawName?: string | null): string {
  if (!rawName) return 'HR';
  if (rawName.includes('Youssef') || rawName.includes('youssef')) return 'Youssef';
  return rawName.trim();
}

export async function listHRAccounts(): Promise<HRAccount[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('hr_accounts')
        .select('*')
        .order('created_at', { ascending: true });
      if (!error && data) {
        return data
          .filter((h: any) => !h.name?.toLowerCase().includes('amar'))
          .map((h: any) => ({
            id: h.id,
            name: cleanHRName(h.name),
            plainPassword: h.plain_password || h.plainPassword || undefined,
            role: 'HR' as const,
            createdAt: h.created_at,
            updatedAt: h.updated_at,
          }));
      }
    } catch (e) {
      console.warn('[DB:Supabase] listHRAccounts error, falling back:', e);
    }
  }

  const store = readStore();
  return (store.hrAccounts || [])
    .filter((h: any) => !h.name?.toLowerCase().includes('amar'))
    .map((h: any) => ({
      id: h.id,
      name: cleanHRName(h.name),
      plainPassword: h.plainPassword || h.plain_password || undefined,
      role: 'HR' as const,
      createdAt: h.createdAt,
      updatedAt: h.updatedAt,
    }));
}

export async function createHRAccount(name: string, passwordPlain: string): Promise<HRAccount> {
  const cleanName = name.trim();
  const passwordHash = await bcrypt.hash(passwordPlain, 10);
  const now = new Date().toISOString();

  const sb = getSupabase();
  if (sb) {
    const { data: existing } = await sb
      .from('hr_accounts')
      .select('id')
      .ilike('name', cleanName)
      .maybeSingle();

    if (existing) {
      throw new Error(`An HR account named "${cleanName}" already exists.`);
    }

    const { data, error } = await sb
      .from('hr_accounts')
      .insert({
        name: cleanName,
        password_hash: passwordHash,
        plain_password: passwordPlain,
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to create HR account.');
    }

    logAudit('ADMIN', 'Executive Administrator', 'CREATE_HR_ACCOUNT', { hrName: cleanName });

    return {
      id: data.id,
      name: data.name,
      plainPassword: data.plain_password || passwordPlain,
      role: 'HR',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  const store = readStore();
  const existing = (store.hrAccounts || []).find(
    (h: any) => h.name?.toLowerCase() === cleanName.toLowerCase()
  );
  if (existing) {
    throw new Error(`An HR account named "${cleanName}" already exists.`);
  }

  const newHR: HRAccount = {
    id: `hr-${crypto.randomUUID()}`,
    name: cleanName,
    passwordHash,
    plainPassword: passwordPlain,
    role: 'HR',
    createdAt: now,
    updatedAt: now,
  };

  store.hrAccounts = store.hrAccounts || [];
  store.hrAccounts.push(newHR);
  writeStore(store);

  logAudit('ADMIN', 'Executive Administrator', 'CREATE_HR_ACCOUNT', { hrName: cleanName });

  return {
    id: newHR.id,
    name: newHR.name,
    role: 'HR',
    createdAt: newHR.createdAt,
    updatedAt: newHR.updatedAt,
  };
}

export async function deleteHRAccount(id: string): Promise<boolean> {
  const sb = getSupabase();
  if (sb) {
    try {
      await sb.from('hr_availability').delete().eq('hr_id', id);
      await sb.from('interview_schedules').update({ hr_id: null }).eq('hr_id', id);
      const { error } = await sb.from('hr_accounts').delete().eq('id', id);
      if (error) {
        throw new Error(error.message || 'Failed to delete HR account.');
      }
      invalidateCache('hr');
      invalidateCache('stats');
      logAudit('ADMIN', 'Executive Administrator', 'DELETE_HR_ACCOUNT', { hrId: id });
      return true;
    } catch (e) {
      console.warn('[DB:Supabase] deleteHRAccount error, falling back:', e);
    }
  }

  const store = readStore();
  store.hrAccounts = (store.hrAccounts || []).filter((h: any) => h.id !== id);
  store.hrAvailability = (store.hrAvailability || []).filter((ha: any) => ha.hrId !== id);
  for (const s of store.interviewSchedules || []) {
    if (s.hrId === id) s.hrId = null;
  }
  writeStore(store);
  invalidateCache('hr');
  invalidateCache('stats');
  logAudit('ADMIN', 'Executive Administrator', 'DELETE_HR_ACCOUNT', { hrId: id });
  return true;
}

export async function updateHRAccountPassword(id: string, newPasswordPlain: string): Promise<boolean> {
  const cleanPass = newPasswordPlain.trim();
  const passwordHash = await bcrypt.hash(cleanPass, 10);
  const now = new Date().toISOString();

  const sb = getSupabase();
  if (sb) {
    try {
      const { error } = await sb
        .from('hr_accounts')
        .update({
          password_hash: passwordHash,
          plain_password: cleanPass,
          updated_at: now,
        })
        .eq('id', id);

      if (!error) {
        invalidateCache('hr');
        logAudit('ADMIN', 'Executive Administrator', 'UPDATE_HR_PASSWORD', { hrId: id });
        return true;
      }
    } catch (e) {
      console.warn('[DB:Supabase] updateHRAccountPassword error, falling back:', e);
    }
  }

  const store = readStore();
  const hr = (store.hrAccounts || []).find((h: any) => h.id === id);
  if (hr) {
    hr.passwordHash = passwordHash;
    hr.plainPassword = cleanPass;
    hr.updatedAt = now;
    writeStore(store);
    invalidateCache('hr');
    logAudit('ADMIN', 'Executive Administrator', 'UPDATE_HR_PASSWORD', { hrId: id });
    return true;
  }
  return false;
}

// ── AVAILABILITY MANAGEMENT ─────────────────────────────────────────

export async function listHRAvailability(): Promise<HRAvailabilityWindow[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      const [{ data: avails }, { data: hrs }] = await Promise.all([
        sb.from('hr_availability').select('*'),
        sb.from('hr_accounts').select('*'),
      ]);
      if (avails) {
        return avails
          .filter((a: any) => {
            const hr = (hrs || []).find((h: any) => h.id === a.hr_id);
            return !hr || !hr.name?.toLowerCase().includes('amar');
          })
          .map((a: any) => {
            const hr = (hrs || []).find((h: any) => h.id === a.hr_id);
            return {
              id: a.id,
              hrId: a.hr_id,
              hrName: hr ? hr.name : 'Unknown HR',
              date: a.date,
              startTime: a.start_time,
              endTime: a.end_time,
              isAvailable: a.is_available,
            };
          });
      }
    } catch (e) {
      console.warn('[DB:Supabase] listHRAvailability fallback:', e);
    }
  }

  const store = readStore();
  return (store.hrAvailability || [])
    .filter((a: any) => {
      const hr = (store.hrAccounts || []).find((h: any) => h.id === a.hrId);
      return !hr || !hr.name?.toLowerCase().includes('amar');
    })
    .map((a: any) => {
      const hr = (store.hrAccounts || []).find((h: any) => h.id === a.hrId);
      return {
        ...a,
        hrName: hr ? hr.name : 'Unknown HR',
      };
    });
}

export async function saveHRAvailability(
  windows: Array<Omit<HRAvailabilityWindow, 'id'>>
): Promise<void> {
  const filteredWindows = windows.filter((w: any) => {
    const name = w.hrName;
    return !name || !name.toLowerCase().includes('amar');
  });

  const sb = getSupabase();
  if (sb) {
    await sb.from('hr_availability').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (filteredWindows.length > 0) {
      const toInsert = filteredWindows.map((w) => ({
        hr_id: w.hrId,
        date: w.date,
        start_time: w.startTime,
        end_time: w.endTime,
        is_available: w.isAvailable,
      }));
      await sb.from('hr_availability').insert(toInsert);
    }
    logAudit('ADMIN', 'Executive Administrator', 'UPDATE_HR_AVAILABILITY', { count: filteredWindows.length });
    return;
  }

  const store = readStore();
  store.hrAvailability = filteredWindows.map((w) => ({
    id: crypto.randomUUID(),
    ...w,
  }));
  writeStore(store);
  logAudit('ADMIN', 'Executive Administrator', 'UPDATE_HR_AVAILABILITY', { count: filteredWindows.length });
}

export async function listHeadAvailability(): Promise<HeadAvailabilityWindow[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data } = await sb.from('head_availability').select('*');
      if (data) {
        return data.map((a: any) => ({
          id: a.id,
          headName: a.head_name,
          headCategory: a.head_category,
          date: a.date,
          startTime: a.start_time,
          endTime: a.end_time,
          isAvailable: a.is_available,
        }));
      }
    } catch (e) {
      console.warn('[DB:Supabase] listHeadAvailability fallback:', e);
    }
  }

  const store = readStore();
  return store.headAvailability || [];
}

export async function saveHeadAvailability(
  windows: Array<Omit<HeadAvailabilityWindow, 'id'>>
): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    await sb.from('head_availability').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (windows.length > 0) {
      const toInsert = windows.map((w) => ({
        head_name: w.headName,
        head_category: w.headCategory,
        date: w.date,
        start_time: w.startTime,
        end_time: w.endTime,
        is_available: w.isAvailable,
      }));
      await sb.from('head_availability').insert(toInsert);
    }
    logAudit('ADMIN', 'Executive Administrator', 'UPDATE_HEAD_AVAILABILITY', { count: windows.length });
    return;
  }

  const store = readStore();
  store.headAvailability = windows.map((w) => ({
    id: crypto.randomUUID(),
    ...w,
  }));
  writeStore(store);
  logAudit('ADMIN', 'Executive Administrator', 'UPDATE_HEAD_AVAILABILITY', { count: windows.length });
}

// ── APPLICANTS & EVALUATIONS ────────────────────────────────────────

export async function listApplicants(): Promise<ApplicantWithTeams[]> {
  const cached = getCached<ApplicantWithTeams[]>('applicants:list', 20000);
  if (cached) return cached;

  const sb = getSupabase();
  if (sb) {
    try {
      const [
        { data: apps },
        { data: appTeams },
        { data: schedules },
        { data: evals },
        { data: reviews },
        { data: decisionsList },
      ] = await Promise.all([
        sb.from('applicants').select('*').order('created_at', { ascending: false }),
        sb.from('applicant_teams').select('*'),
        sb.from('interview_schedules').select('*'),
        sb.from('evaluations').select('*'),
        sb.from('applicant_reviews').select('*'),
        sb.from('team_decisions').select('*'),
      ]);

      if (apps) {
        const result = apps.map((a: any) => {
          const teamLinks = (appTeams || []).filter((at: any) => at.applicant_id === a.id);
          const resolvedTeams: TeamDefinition[] = [];
          for (const tl of teamLinks) {
            const team = findTeam(tl.team_id);
            if (team) resolvedTeams.push(team);
          }

          const interview = (schedules || []).find((s: any) => s.applicant_id === a.id);
          const interviewStatus = interview ? interview.status : 'UNSCHEDULED';
          const interviewSchedule = interview ? {
            id: interview.id,
            date: interview.date,
            startTime: interview.start_time,
            endTime: interview.end_time,
            location: interview.location || '',
            meetingLink: interview.meeting_link || '',
            interviewMode: interview.interview_mode || 'ONLINE',
            status: interview.status,
            hrId: interview.hr_id || null,
          } : null;

          const evalRecord = (evals || []).find((e: any) => e.applicant_id === a.id);
          const evaluationStatus: 'PENDING' | 'COMPLETED' = evalRecord ? 'COMPLETED' : 'PENDING';

          const review = (reviews || []).find((r: any) => r.applicant_id === a.id);

          const decisions: Record<string, 'PENDING' | 'ACCEPTED' | 'REJECTED'> = {};
          for (const team of resolvedTeams) {
            const dec = (decisionsList || []).find(
              (td: any) => td.applicant_id === a.id && td.team_id === team.id
            );
            decisions[team.id] = dec ? dec.decision : 'PENDING';
          }

          return {
            id: a.id,
            fullName: a.full_name,
            phoneNumber: a.phone_number,
            email: a.email,
            nationalId: a.national_id,
            faculty: a.faculty,
            academicLevel: a.academic_level,
            createdAt: a.created_at,
            teams: resolvedTeams,
            interviewStatus,
            interviewSchedule,
            evaluationStatus,
            generalAverage: evalRecord && evalRecord.general_average !== null ? Number(evalRecord.general_average) : null,
            techAverage: evalRecord && evalRecord.tech_average !== null ? Number(evalRecord.tech_average) : null,
            nonTechAverage: evalRecord && evalRecord.non_tech_average !== null ? Number(evalRecord.non_tech_average) : null,
            isReviewed: review ? review.is_reviewed : false,
            reviewedAt: review ? review.reviewed_at : null,
            reviewedBy: review ? review.reviewed_by : null,
            decisionWhatsappStatus: review ? (review.decision_whatsapp_status || 'NOT_SENT') : 'NOT_SENT',
            decisionWhatsappSentAt: review ? review.decision_whatsapp_sent_at : null,
            decisionWhatsappSentBy: review ? review.decision_whatsapp_sent_by : null,
            decisions,
          };
        });
        setCached('applicants:list', result);
        return result;
      }
    } catch (e) {
      console.warn('[DB:Supabase] listApplicants error, falling back:', e);
    }
  }

  const store = readStore();
  return (store.applicants || []).map((a: any) => {
    const teamLinks = (store.applicantTeams || []).filter((at: any) => at.applicantId === a.id);
    const resolvedTeams: TeamDefinition[] = [];
    for (const tl of teamLinks) {
      const team = findTeam(tl.teamId);
      if (team) resolvedTeams.push(team);
    }

    const interview = (store.interviewSchedules || []).find((s: any) => s.applicantId === a.id);
    const interviewStatus = interview ? interview.status : 'UNSCHEDULED';
    const interviewSchedule = interview ? {
      id: interview.id,
      date: interview.date,
      startTime: interview.startTime,
      endTime: interview.endTime,
      location: interview.location || '',
      meetingLink: interview.meetingLink || '',
      interviewMode: interview.interviewMode || 'ONLINE',
      status: interview.status,
      hrId: interview.hrId || null,
    } : null;

    const evalRecord = (store.evaluations || []).find((e: any) => e.applicantId === a.id);
    const evaluationStatus: 'PENDING' | 'COMPLETED' = evalRecord ? 'COMPLETED' : 'PENDING';

    const review = (store.applicantReviews || []).find((r: any) => r.applicantId === a.id);

    const decisions: Record<string, 'PENDING' | 'ACCEPTED' | 'REJECTED'> = {};
    for (const team of resolvedTeams) {
      const dec = (store.teamDecisions || []).find(
        (td: any) => td.applicantId === a.id && td.teamId === team.id
      );
      decisions[team.id] = dec ? dec.decision : 'PENDING';
    }

    return {
      id: a.id,
      fullName: a.fullName,
      phoneNumber: a.phoneNumber,
      email: a.email,
      nationalId: a.nationalId,
      createdAt: a.createdAt,
      teams: resolvedTeams,
      interviewStatus,
      interviewSchedule,
      evaluationStatus,
      generalAverage: evalRecord ? evalRecord.generalAverage : null,
      techAverage: evalRecord ? evalRecord.techAverage : null,
      nonTechAverage: evalRecord ? evalRecord.nonTechAverage : null,
      isReviewed: review ? review.isReviewed : false,
      reviewedAt: review ? review.reviewedAt : null,
      reviewedBy: review ? review.reviewedBy : null,
      decisionWhatsappStatus: review ? (review.decisionWhatsappStatus || 'NOT_SENT') : 'NOT_SENT',
      decisionWhatsappSentAt: review ? review.decisionWhatsappSentAt : null,
      decisionWhatsappSentBy: review ? review.decisionWhatsappSentBy : null,
      decisions,
    };
  });
}

export async function getApplicantDetail(id: string): Promise<any | null> {
  const sb = getSupabase();
  if (sb) {
    try {
      const [
        { data: applicant },
        { data: appTeams },
        { data: interview },
        { data: evalRecord },
        { data: review },
        { data: decisionsList },
      ] = await Promise.all([
        sb.from('applicants').select('*').eq('id', id).maybeSingle(),
        sb.from('applicant_teams').select('*').eq('applicant_id', id),
        sb.from('interview_schedules').select('*').eq('applicant_id', id).maybeSingle(),
        sb.from('evaluations').select('*').eq('applicant_id', id).maybeSingle(),
        sb.from('applicant_reviews').select('*').eq('applicant_id', id).maybeSingle(),
        sb.from('team_decisions').select('*').eq('applicant_id', id),
      ]);

      if (applicant) {
        const resolvedTeams: TeamDefinition[] = [];
        for (const tl of appTeams || []) {
          const team = findTeam(tl.team_id);
          if (team) resolvedTeams.push(team);
        }

        let interviewData = null;
        if (interview) {
          const [{ data: hr }, { data: heads }] = await Promise.all([
            sb.from('hr_accounts').select('name').eq('id', interview.hr_id).maybeSingle(),
            sb.from('interview_heads').select('*').eq('interview_id', interview.id),
          ]);
          interviewData = {
            id: interview.id,
            applicantId: interview.applicant_id,
            hrId: interview.hr_id,
            hrName: hr ? hr.name : 'Unknown HR',
            assignedHeads: (heads || []).map((h: any) => h.head_name),
            date: interview.date,
            startTime: interview.start_time,
            endTime: interview.end_time,
            durationMinutes: interview.duration_minutes,
            interviewMode: interview.interview_mode,
            location: interview.location,
            meetingLink: interview.meeting_link,
            status: interview.status,
            isManualOverride: interview.is_manual_override,
          };
        }

        let detailedEvaluation = null;
        if (evalRecord) {
          const { data: scores } = await sb
            .from('evaluation_scores')
            .select('*')
            .eq('evaluation_id', evalRecord.id);

          const scoresMap: Record<string, number> = {};
          const textResponsesMap: Record<string, string> = {};
          for (const sc of scores || []) {
            if (sc.score !== null && sc.score !== undefined) {
              scoresMap[sc.criterion_id] = sc.score;
            }
            if (sc.text_response) {
              textResponsesMap[sc.criterion_id] = sc.text_response;
            }
          }

          detailedEvaluation = {
            id: evalRecord.id,
            interviewId: evalRecord.interview_id,
            applicantId: evalRecord.applicant_id,
            hrId: evalRecord.hr_id,
            generalNotes: evalRecord.general_notes,
            techNotes: evalRecord.tech_notes,
            nonTechNotes: evalRecord.non_tech_notes,
            generalAverage: evalRecord.general_average !== null ? Number(evalRecord.general_average) : null,
            techAverage: evalRecord.tech_average !== null ? Number(evalRecord.tech_average) : null,
            nonTechAverage: evalRecord.non_tech_average !== null ? Number(evalRecord.non_tech_average) : null,
            submittedAt: evalRecord.submitted_at,
            scores: scoresMap,
            textResponses: textResponsesMap,
          };
        }

        const decisions: Record<string, 'PENDING' | 'ACCEPTED' | 'REJECTED'> = {};
        for (const team of resolvedTeams) {
          const dec = (decisionsList || []).find((td: any) => td.team_id === team.id);
          decisions[team.id] = dec ? dec.decision : 'PENDING';
        }

        return {
          id: applicant.id,
          fullName: applicant.full_name,
          phoneNumber: applicant.phone_number,
          email: applicant.email,
          nationalId: applicant.national_id,
          faculty: applicant.faculty,
          academicLevel: applicant.academic_level,
          createdAt: applicant.created_at,
          teams: resolvedTeams,
          interview: interviewData,
          evaluation: detailedEvaluation,
          generalAverage: detailedEvaluation?.generalAverage ?? null,
          techAverage: detailedEvaluation?.techAverage ?? null,
          nonTechAverage: detailedEvaluation?.nonTechAverage ?? null,
          isReviewed: review ? review.is_reviewed : false,
          reviewedAt: review ? review.reviewed_at : null,
          reviewedBy: review ? review.reviewed_by : null,
          decisionWhatsappStatus: review ? (review.decision_whatsapp_status || 'NOT_SENT') : 'NOT_SENT',
          decisionWhatsappSentAt: review ? review.decision_whatsapp_sent_at : null,
          decisionWhatsappSentBy: review ? review.decision_whatsapp_sent_by : null,
          decisions,
        };
      }
    } catch (e) {
      console.warn('[DB:Supabase] getApplicantDetail error, falling back:', e);
    }
  }

  const store = readStore();
  const applicant = (store.applicants || []).find((a: any) => a.id === id);
  if (!applicant) return null;

  const teamLinks = (store.applicantTeams || []).filter((at: any) => at.applicantId === id);
  const resolvedTeams: TeamDefinition[] = [];
  for (const tl of teamLinks) {
    const team = findTeam(tl.teamId);
    if (team) resolvedTeams.push(team);
  }

  const interview = (store.interviewSchedules || []).find((s: any) => s.applicantId === id);
  let interviewData = null;
  if (interview) {
    const hr = (store.hrAccounts || []).find((h: any) => h.id === interview.hrId);
    const heads = (store.interviewHeads || []).filter((ih: any) => ih.interviewId === interview.id);
    interviewData = {
      ...interview,
      hrName: hr ? hr.name : 'Unknown HR',
      assignedHeads: heads.map((h: any) => h.headName),
    };
  }

  const evalRecord = (store.evaluations || []).find((e: any) => e.applicantId === id);
  let detailedEvaluation = null;
  if (evalRecord) {
    const scores = (store.evaluationScores || []).filter((es: any) => es.evaluationId === evalRecord.id);
    const scoresMap: Record<string, number> = {};
    const textResponsesMap: Record<string, string> = {};
    for (const sc of scores) {
      if (sc.score !== null && sc.score !== undefined) {
        scoresMap[sc.criterionId] = sc.score;
      }
      if (sc.textResponse) {
        textResponsesMap[sc.criterionId] = sc.textResponse;
      }
    }
    detailedEvaluation = {
      ...evalRecord,
      scores: scoresMap,
      textResponses: textResponsesMap,
    };
  }

  const review = (store.applicantReviews || []).find((r: any) => r.applicantId === id);

  const decisions: Record<string, 'PENDING' | 'ACCEPTED' | 'REJECTED'> = {};
  for (const team of resolvedTeams) {
    const dec = (store.teamDecisions || []).find(
      (td: any) => td.applicantId === id && td.teamId === team.id
    );
    decisions[team.id] = dec ? dec.decision : 'PENDING';
  }

  return {
    ...applicant,
    teams: resolvedTeams,
    interview: interviewData,
    evaluation: detailedEvaluation,
    generalAverage: detailedEvaluation?.generalAverage ?? null,
    techAverage: detailedEvaluation?.techAverage ?? null,
    nonTechAverage: detailedEvaluation?.nonTechAverage ?? null,
    isReviewed: review ? review.isReviewed : false,
    reviewedAt: review ? review.reviewedAt : null,
    reviewedBy: review ? review.reviewedBy : null,
    decisions,
  };
}

export async function deleteApplicant(
  applicantId: string,
  actorName: string = 'Executive Administrator'
): Promise<boolean> {
  const sb = getSupabase();
  if (sb) {
    try {
      await sb.from('email_logs').delete().eq('applicant_id', applicantId);
      await sb.from('team_decisions').delete().eq('applicant_id', applicantId);
      await sb.from('evaluations').delete().eq('applicant_id', applicantId);
      await sb.from('applicant_reviews').delete().eq('applicant_id', applicantId);

      const { data: scheds } = await sb.from('interview_schedules').select('id').eq('applicant_id', applicantId);
      for (const s of scheds || []) {
        await sb.from('interview_heads').delete().eq('interview_id', s.id);
      }
      await sb.from('interview_schedules').delete().eq('applicant_id', applicantId);
      await sb.from('applicant_teams').delete().eq('applicant_id', applicantId);

      const { error } = await sb.from('applicants').delete().eq('id', applicantId);
      if (error) throw error;

      invalidateCache('applicants');
      invalidateCache('stats');
      logAudit('ADMIN', actorName, 'DELETE_APPLICANT', { applicantId });
      return true;
    } catch (e) {
      console.warn('[DB:Supabase] deleteApplicant error, falling back:', e);
    }
  }

  const store = readStore();
  store.applicants = (store.applicants || []).filter((a: any) => a.id !== applicantId);
  store.applicantTeams = (store.applicantTeams || []).filter((at: any) => at.applicantId !== applicantId);

  const scheds = (store.interviewSchedules || []).filter((s: any) => s.applicantId === applicantId);
  const schedIds = new Set(scheds.map((s: any) => s.id));
  store.interviewSchedules = (store.interviewSchedules || []).filter((s: any) => s.applicantId !== applicantId);
  store.interviewHeads = (store.interviewHeads || []).filter((ih: any) => !schedIds.has(ih.interviewId));
  store.evaluations = (store.evaluations || []).filter((e: any) => e.applicantId !== applicantId);
  store.applicantReviews = (store.applicantReviews || []).filter((r: any) => r.applicantId !== applicantId);
  store.teamDecisions = (store.teamDecisions || []).filter((td: any) => td.applicantId !== applicantId);
  store.emailLogs = (store.emailLogs || []).filter((el: any) => el.applicantId !== applicantId);

  writeStore(store);
  invalidateCache('applicants');
  invalidateCache('stats');
  logAudit('ADMIN', actorName, 'DELETE_APPLICANT', { applicantId });
  return true;
}

export async function toggleApplicantReviewed(
  applicantId: string,
  actorName: string
): Promise<boolean> {
  const sb = getSupabase();
  if (sb) {
    const { data: existing } = await sb
      .from('applicant_reviews')
      .select('*')
      .eq('applicant_id', applicantId)
      .maybeSingle();

    const newReviewedState = existing ? !existing.is_reviewed : true;
    const now = new Date().toISOString();

    if (existing) {
      await sb
        .from('applicant_reviews')
        .update({
          is_reviewed: newReviewedState,
          reviewed_at: now,
          reviewed_by: actorName,
        })
        .eq('id', existing.id);
    } else {
      await sb.from('applicant_reviews').insert({
        applicant_id: applicantId,
        is_reviewed: true,
        reviewed_at: now,
        reviewed_by: actorName,
        created_at: now,
      });
    }

    logAudit('ADMIN', actorName, 'TOGGLE_APPLICANT_REVIEWED', { applicantId, newReviewedState });
    return newReviewedState;
  }

  const store = readStore();
  const existing = (store.applicantReviews || []).find((r: any) => r.applicantId === applicantId);
  const newReviewedState = existing ? !existing.isReviewed : true;

  if (existing) {
    existing.isReviewed = newReviewedState;
    existing.reviewedAt = new Date().toISOString();
    existing.reviewedBy = actorName;
  } else {
    store.applicantReviews = store.applicantReviews || [];
    store.applicantReviews.push({
      id: crypto.randomUUID(),
      applicantId,
      isReviewed: true,
      reviewedAt: new Date().toISOString(),
      reviewedBy: actorName,
    });
  }

  writeStore(store);
  logAudit('ADMIN', actorName, 'TOGGLE_APPLICANT_REVIEWED', { applicantId, newReviewedState });
  return newReviewedState;
}

export async function updateDecisionWhatsappStatus(
  applicantId: string,
  status: 'NOT_SENT' | 'SENT',
  actorName: string
): Promise<boolean> {
  const sb = getSupabase();
  const now = new Date().toISOString();
  if (sb) {
    const { data: existing } = await sb
      .from('applicant_reviews')
      .select('*')
      .eq('applicant_id', applicantId)
      .maybeSingle();

    if (existing) {
      await sb
        .from('applicant_reviews')
        .update({
          decision_whatsapp_status: status,
          decision_whatsapp_sent_at: status === 'SENT' ? now : null,
          decision_whatsapp_sent_by: status === 'SENT' ? actorName : null,
        })
        .eq('id', existing.id);
    } else {
      await sb.from('applicant_reviews').insert({
        applicant_id: applicantId,
        is_reviewed: false,
        decision_whatsapp_status: status,
        decision_whatsapp_sent_at: status === 'SENT' ? now : null,
        decision_whatsapp_sent_by: status === 'SENT' ? actorName : null,
        created_at: now,
      });
    }
    invalidateCache('applicants');
    invalidateCache('stats');
    logAudit('ADMIN', actorName, 'UPDATE_DECISION_WHATSAPP_STATUS', { applicantId, status });
    return true;
  }

  const store = readStore();
  if (!store.applicantReviews) store.applicantReviews = [];
  const existing = store.applicantReviews.find((r: any) => r.applicantId === applicantId);
  if (existing) {
    existing.decisionWhatsappStatus = status;
    existing.decisionWhatsappSentAt = status === 'SENT' ? now : null;
    existing.decisionWhatsappSentBy = status === 'SENT' ? actorName : null;
  } else {
    store.applicantReviews.push({
      id: crypto.randomUUID(),
      applicantId,
      isReviewed: false,
      decisionWhatsappStatus: status,
      decisionWhatsappSentAt: status === 'SENT' ? now : null,
      decisionWhatsappSentBy: status === 'SENT' ? actorName : null,
      createdAt: now,
    });
  }
  writeStore(store);
  invalidateCache('applicants');
  invalidateCache('stats');
  return true;
}

export async function setTeamDecision(
  applicantId: string,
  teamId: string,
  decision: DecisionStatus,
  actorName: string
): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    const { data: applied } = await sb
      .from('applicant_teams')
      .select('id')
      .eq('applicant_id', applicantId)
      .eq('team_id', teamId)
      .maybeSingle();

    if (!applied) {
      throw new Error('Applicant did not apply for this committee.');
    }

    const { data: existing } = await sb
      .from('team_decisions')
      .select('id')
      .eq('applicant_id', applicantId)
      .eq('team_id', teamId)
      .maybeSingle();

    const now = new Date().toISOString();
    if (existing) {
      await sb
        .from('team_decisions')
        .update({
          decision,
          decided_at: now,
          decided_by: actorName,
        })
        .eq('id', existing.id);
    } else {
      await sb.from('team_decisions').insert({
        applicant_id: applicantId,
        team_id: teamId,
        decision,
        decided_at: now,
        decided_by: actorName,
        created_at: now,
      });
    }

    logAudit('ADMIN', actorName, 'SET_TEAM_DECISION', { applicantId, teamId, decision });
    return;
  }

  const store = readStore();
  const applied = (store.applicantTeams || []).some(
    (at: any) => at.applicantId === applicantId && at.teamId === teamId
  );
  if (!applied) {
    throw new Error('Applicant did not apply for this committee.');
  }

  const existing = (store.teamDecisions || []).find(
    (td: any) => td.applicantId === applicantId && td.teamId === teamId
  );

  if (existing) {
    existing.decision = decision;
    existing.decidedAt = new Date().toISOString();
    existing.decidedBy = actorName;
  } else {
    store.teamDecisions = store.teamDecisions || [];
    store.teamDecisions.push({
      id: crypto.randomUUID(),
      applicantId,
      teamId,
      decision,
      decidedAt: new Date().toISOString(),
      decidedBy: actorName,
    });
  }

  writeStore(store);
  logAudit('ADMIN', actorName, 'SET_TEAM_DECISION', { applicantId, teamId, decision });
}

// ── EVALUATION CRITERIA ─────────────────────────────────────────────

export async function listEvaluationCriteria(): Promise<EvaluationCriterion[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('evaluation_criteria')
        .select('*')
        .order('order_index', { ascending: true });
      if (!error && data && data.length > 0) {
        return data.map((c: any) => ({
          id: c.id,
          name: c.name,
          section: c.section as EvaluationSectionType,
          teamCategory: c.team_category,
          description: c.description || '',
          responseType: c.response_type || 'SCORE',
          minScore: c.min_score,
          maxScore: c.max_score,
          orderIndex: c.order_index,
          isActive: c.is_active,
        }));
      }
    } catch (e) {
      console.warn('[DB:Supabase] listEvaluationCriteria error, fallback:', e);
    }
  }

  const store = readStore();
  return (store.evaluationCriteria || []).sort((a: any, b: any) => a.orderIndex - b.orderIndex);
}

export async function saveEvaluationCriterion(
  criterion: Omit<EvaluationCriterion, 'id'> & { id?: string }
): Promise<EvaluationCriterion> {
  const sb = getSupabase();
  if (sb) {
    if (criterion.id) {
      const { data, error } = await sb
        .from('evaluation_criteria')
        .update({
          name: criterion.name,
          section: criterion.section,
          team_category: criterion.teamCategory,
          description: criterion.description,
          response_type: criterion.responseType || 'SCORE',
          min_score: criterion.minScore,
          max_score: criterion.maxScore,
          order_index: criterion.orderIndex,
          is_active: criterion.isActive,
        })
        .eq('id', criterion.id)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return {
        id: data.id,
        name: data.name,
        section: data.section,
        teamCategory: data.team_category,
        description: data.description || '',
        responseType: data.response_type || 'SCORE',
        minScore: data.min_score,
        maxScore: data.max_score,
        orderIndex: data.order_index,
        isActive: data.is_active,
      };
    } else {
      const { data, error } = await sb
        .from('evaluation_criteria')
        .insert({
          name: criterion.name,
          section: criterion.section,
          team_category: criterion.teamCategory,
          description: criterion.description,
          response_type: criterion.responseType || 'SCORE',
          min_score: criterion.minScore,
          max_score: criterion.maxScore,
          order_index: criterion.orderIndex,
          is_active: criterion.isActive,
        })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      logAudit('ADMIN', 'Executive Administrator', 'CREATE_CRITERION', { name: criterion.name });
      return {
        id: data.id,
        name: data.name,
        section: data.section,
        teamCategory: data.team_category,
        description: data.description || '',
        responseType: data.response_type || 'SCORE',
        minScore: data.min_score,
        maxScore: data.max_score,
        orderIndex: data.order_index,
        isActive: data.is_active,
      };
    }
  }

  const store = readStore();
  store.evaluationCriteria = store.evaluationCriteria || [];

  if (criterion.id) {
    const index = store.evaluationCriteria.findIndex((c: any) => c.id === criterion.id);
    if (index === -1) throw new Error('Criterion not found.');
    store.evaluationCriteria[index] = { ...criterion, id: criterion.id };
    writeStore(store);
    return store.evaluationCriteria[index];
  }

  const newCriterion: EvaluationCriterion = {
    ...criterion,
    id: `crit-${crypto.randomUUID()}`,
  };
  store.evaluationCriteria.push(newCriterion);
  writeStore(store);
  logAudit('ADMIN', 'Executive Administrator', 'CREATE_CRITERION', { name: newCriterion.name });
  return newCriterion;
}

export async function deleteEvaluationCriterion(id: string): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from('evaluation_criteria').delete().eq('id', id);
    if (error) throw new Error(error.message);
    logAudit('ADMIN', 'Executive Administrator', 'DELETE_CRITERION', { id });
    return;
  }

  const store = readStore();
  store.evaluationCriteria = (store.evaluationCriteria || []).filter((c: any) => c.id !== id);
  writeStore(store);
  logAudit('ADMIN', 'Executive Administrator', 'DELETE_CRITERION', { id });
}

// ── HR EVALUATION SUBMISSION ────────────────────────────────────────

export async function getAssignedInterviewsForHR(hrId?: string): Promise<any[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      let query = sb.from('interview_schedules').select('*');
      const isUuid = hrId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(hrId);
      if (isUuid) {
        query = query.eq('hr_id', hrId);
      }
      const { data: schedules } = await query;
      const [
        { data: apps },
        { data: appTeams },
        { data: heads },
        { data: evals },
        { data: hrs },
      ] = await Promise.all([
        sb.from('applicants').select('*'),
        sb.from('applicant_teams').select('*'),
        sb.from('interview_heads').select('*'),
        sb.from('evaluations').select('*'),
        sb.from('hr_accounts').select('*'),
      ]);

      return (schedules || []).map((slot: any) => {
        const applicant = (apps || []).find((a: any) => a.id === slot.applicant_id);
        const teamLinks = (appTeams || []).filter((at: any) => at.applicant_id === slot.applicant_id);
        const resolvedTeams: TeamDefinition[] = [];
        for (const tl of teamLinks) {
          const team = findTeam(tl.team_id);
          if (team) resolvedTeams.push(team);
        }

        const slotHeads = (heads || []).filter((ih: any) => ih.interview_id === slot.id);
        const evalRecord = (evals || []).find((e: any) => e.interview_id === slot.id);
        const hr = (hrs || []).find((h: any) => h.id === slot.hr_id);

        return {
          id: slot.id,
          applicantId: slot.applicant_id,
          hrId: slot.hr_id,
          date: slot.date,
          startTime: slot.start_time,
          endTime: slot.end_time,
          durationMinutes: slot.duration_minutes,
          interviewMode: slot.interview_mode,
          location: slot.location,
          meetingLink: slot.meeting_link,
          status: slot.status,
          applicantName: applicant ? applicant.full_name : 'Applicant',
          applicantEmail: applicant ? applicant.email : '',
          applicantPhone: applicant ? applicant.phone_number : '',
          applicantFaculty: applicant ? (applicant.faculty || applicant.college || '') : '',
          hrName: hr ? hr.name : 'Assigned HR',
          appliedTeams: resolvedTeams,
          assignedHeads: slotHeads.map((h: any) => h.head_name),
          isEvaluated: Boolean(evalRecord),
        };
      });
    } catch (e) {
      console.warn('[DB:Supabase] getAssignedInterviewsForHR error, fallback:', e);
    }
  }

  const store = readStore();
  const schedules = hrId
    ? (store.interviewSchedules || []).filter((s: any) => s.hrId === hrId)
    : (store.interviewSchedules || []);

  return schedules.map((slot: any) => {
    const applicant = (store.applicants || []).find((a: any) => a.id === slot.applicantId);
    const teamLinks = (store.applicantTeams || []).filter((at: any) => at.applicantId === slot.applicantId);
    const resolvedTeams: TeamDefinition[] = [];
    for (const tl of teamLinks) {
      const team = findTeam(tl.teamId);
      if (team) resolvedTeams.push(team);
    }

    const heads = (store.interviewHeads || []).filter((ih: any) => ih.interviewId === slot.id);
    const evalRecord = (store.evaluations || []).find((e: any) => e.interviewId === slot.id);
    const hr = (store.hrAccounts || []).find((h: any) => h.id === slot.hrId);

    return {
      ...slot,
      applicantName: applicant ? applicant.fullName : 'Applicant',
      applicantEmail: applicant ? applicant.email : '',
      applicantPhone: applicant ? applicant.phoneNumber : '',
      applicantFaculty: applicant ? (applicant.faculty || applicant.college || '') : '',
      hrName: hr ? hr.name : 'Assigned HR',
      appliedTeams: resolvedTeams,
      assignedHeads: heads.map((h: any) => h.headName),
      isEvaluated: Boolean(evalRecord),
    };
  });
}

export async function getInterviewDetails(interviewId: string): Promise<any | null> {
  const sb = getSupabase();
  if (sb) {
    try {
      let slot: any = null;
      const { data: slotById } = await sb
        .from('interview_schedules')
        .select('*')
        .eq('id', interviewId)
        .maybeSingle();

      if (slotById) {
        slot = slotById;
      } else {
        // Check if passed parameter is an applicant ID
        const { data: slotByApp } = await sb
          .from('interview_schedules')
          .select('*')
          .eq('applicant_id', interviewId)
          .maybeSingle();

        if (slotByApp) {
          slot = slotByApp;
        } else {
          // Check if applicant exists directly without any prior schedule or email
          const { data: directApp } = await sb
            .from('applicants')
            .select('*')
            .eq('id', interviewId)
            .maybeSingle();

          if (directApp) {
            const today = new Date().toISOString().split('T')[0];
            const nowTime = new Date().toTimeString().slice(0, 5);
            const endTime = new Date(Date.now() + 15 * 60000).toTimeString().slice(0, 5);

            const { data: hrList } = await sb.from('hr_accounts').select('id, name').limit(1);
            const defaultHrId = hrList && hrList.length > 0 ? hrList[0].id : '00000000-0000-0000-0000-000000000001';

            const { data: newSlot } = await sb
              .from('interview_schedules')
              .insert({
                applicant_id: directApp.id,
                hr_id: defaultHrId,
                date: today,
                start_time: nowTime,
                end_time: endTime,
                duration_minutes: 15,
                interview_mode: 'OFFLINE',
                status: 'IN_PROGRESS',
              })
              .select()
              .single();

            if (newSlot) {
              slot = newSlot;
            }
          }
        }
      }

      if (!slot) return null;

      const [
        { data: applicant },
        { data: appTeams },
        { data: heads },
        { data: hr },
        { data: evalRecord },
      ] = await Promise.all([
        sb.from('applicants').select('*').eq('id', slot.applicant_id).maybeSingle(),
        sb.from('applicant_teams').select('*').eq('applicant_id', slot.applicant_id),
        sb.from('interview_heads').select('*').eq('interview_id', slot.id),
        sb.from('hr_accounts').select('*').eq('id', slot.hr_id).maybeSingle(),
        sb.from('evaluations').select('*').eq('interview_id', slot.id).maybeSingle(),
      ]);

      const resolvedTeams: any[] = [];
      for (const tl of appTeams || []) {
        const team = findTeam(tl.team_id);
        if (team) {
          resolvedTeams.push({
            ...team,
            category: team.broadCategory,
            broadCategory: team.broadCategory,
          });
        }
      }

      let evaluation = null;
      if (evalRecord) {
        const { data: scores } = await sb
          .from('evaluation_scores')
          .select('*')
          .eq('evaluation_id', evalRecord.id);

        const scoreMap: Record<string, number> = {};
        const textResponsesMap: Record<string, string> = {};
        for (const sc of scores || []) {
          if (sc.score !== null && sc.score !== undefined) {
            scoreMap[sc.criterion_id] = sc.score;
          }
          if (sc.text_response) {
            textResponsesMap[sc.criterion_id] = sc.text_response;
          }
        }
        evaluation = {
          id: evalRecord.id,
          interviewId: evalRecord.interview_id,
          applicantId: evalRecord.applicant_id,
          hrId: evalRecord.hr_id,
          generalNotes: evalRecord.general_notes,
          techNotes: evalRecord.tech_notes,
          nonTechNotes: evalRecord.non_tech_notes,
          generalAverage: evalRecord.general_average !== null ? Number(evalRecord.general_average) : null,
          techAverage: evalRecord.tech_average !== null ? Number(evalRecord.tech_average) : null,
          nonTechAverage: evalRecord.non_tech_average !== null ? Number(evalRecord.non_tech_average) : null,
          submittedAt: evalRecord.submitted_at,
          status: evalRecord.status || 'COMPLETED',
          scores: scoreMap,
          textResponses: textResponsesMap,
        };
      }

      return {
        id: slot.id,
        applicantId: slot.applicant_id,
        hrId: slot.hr_id,
        date: slot.date,
        startTime: slot.start_time,
        endTime: slot.end_time,
        durationMinutes: slot.duration_minutes,
        interviewMode: slot.interview_mode,
        location: slot.location,
        meetingLink: slot.meeting_link,
        status: slot.status,
        applicant: applicant ? {
          id: applicant.id,
          fullName: applicant.full_name,
          phoneNumber: applicant.phone_number,
          email: applicant.email,
          nationalId: applicant.national_id,
          faculty: applicant.faculty || applicant.college || '',
          academicLevel: applicant.academic_level,
        } : null,
        appliedTeams: resolvedTeams,
        assignedHeads: (heads || []).map((h: any) => ({ name: h.head_name, category: h.head_category })),
        hrName: hr ? hr.name : 'Assigned HR',
        evaluation,
      };
    } catch (e) {
      console.warn('[DB:Supabase] getInterviewDetails error, fallback:', e);
    }
  }

  const store = readStore();
  let slot = (store.interviewSchedules || []).find((s: any) => s.id === interviewId);
  if (!slot) {
    slot = (store.interviewSchedules || []).find((s: any) => s.applicantId === interviewId);
  }
  if (!slot) {
    const directApp = (store.applicants || []).find((a: any) => a.id === interviewId);
    if (directApp) {
      const today = new Date().toISOString().split('T')[0];
      const nowTime = new Date().toTimeString().slice(0, 5);
      const endTime = new Date(Date.now() + 15 * 60000).toTimeString().slice(0, 5);
      const defaultHr = (store.hrAccounts || [])[0];
      slot = {
        id: crypto.randomUUID(),
        applicantId: directApp.id,
        hrId: defaultHr ? defaultHr.id : '00000000-0000-0000-0000-000000000001',
        date: today,
        startTime: nowTime,
        endTime: endTime,
        durationMinutes: 15,
        interviewMode: 'OFFLINE',
        status: 'IN_PROGRESS',
      };
      store.interviewSchedules = store.interviewSchedules || [];
      store.interviewSchedules.push(slot);
      writeStore(store);
    }
  }
  if (!slot) return null;

  const applicant = (store.applicants || []).find((a: any) => a.id === slot.applicantId);
  const teamLinks = (store.applicantTeams || []).filter((at: any) => at.applicantId === slot.applicantId);
  const resolvedTeams: any[] = [];
  for (const tl of teamLinks) {
    const team = findTeam(tl.teamId);
    if (team) {
      resolvedTeams.push({
        ...team,
        category: team.broadCategory,
        broadCategory: team.broadCategory,
      });
    }
  }

  const heads = (store.interviewHeads || []).filter((ih: any) => ih.interviewId === slot.id);
  const hr = (store.hrAccounts || []).find((h: any) => h.id === slot.hrId);
  const evalRecord = (store.evaluations || []).find((e: any) => e.interviewId === slot.id);

  let evaluation = null;
  if (evalRecord) {
    const scores = (store.evaluationScores || []).filter((es: any) => es.evaluationId === evalRecord.id);
    const scoreMap: Record<string, number> = {};
    const textResponsesMap: Record<string, string> = {};
    for (const sc of scores) {
      if (sc.score !== null && sc.score !== undefined) {
        scoreMap[sc.criterionId] = sc.score;
      }
      if (sc.textResponse) {
        textResponsesMap[sc.criterionId] = sc.textResponse;
      }
    }
    evaluation = {
      ...evalRecord,
      scores: scoreMap,
      textResponses: textResponsesMap,
    };
  }

  return {
    ...slot,
    applicant: applicant ? {
      ...applicant,
      faculty: applicant.faculty || applicant.college || '',
    } : null,
    appliedTeams: resolvedTeams,
    assignedHeads: heads.map((h: any) => ({ name: h.headName, category: h.headCategory })),
    hrName: hr ? hr.name : 'Assigned HR',
    evaluation,
  };
}

export async function startInterviewSession(interviewId: string): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    await sb
      .from('interview_schedules')
      .update({ status: 'IN_PROGRESS', updated_at: new Date().toISOString() })
      .or(`id.eq.${interviewId},applicant_id.eq.${interviewId}`)
      .eq('status', 'SCHEDULED');
    return;
  }

  const store = readStore();
  const slot = (store.interviewSchedules || []).find(
    (s: any) => (s.id === interviewId || s.applicantId === interviewId) && s.status === 'SCHEDULED'
  );
  if (slot) {
    slot.status = 'IN_PROGRESS';
    writeStore(store);
  }
}

export async function submitInterviewEvaluation(
  submission: EvaluationSubmission
): Promise<void> {
  const criteria = await listEvaluationCriteria();
  const generalScores: number[] = [];
  const techScores: number[] = [];
  const nonTechScores: number[] = [];

  // Only SCORE-type criteria contribute to averages
  for (const [critId, scoreVal] of Object.entries(submission.scores)) {
    const crit = criteria.find((c) => c.id === critId);
    if (!crit || crit.responseType === 'PARAGRAPH') continue;

    if (crit.section === 'GENERAL') {
      generalScores.push(scoreVal);
    } else if (crit.section === 'TECH') {
      techScores.push(scoreVal);
    } else if (crit.section === 'NON_TECH') {
      nonTechScores.push(scoreVal);
    }
  }

  const calcAvg = (scores: number[]) => {
    if (scores.length === 0) return null;
    const sum = scores.reduce((a, b) => a + b, 0);
    return Math.round((sum / scores.length) * 100) / 100;
  };

  const generalAverage = calcAvg(generalScores);
  const techAverage = calcAvg(techScores);
  const nonTechAverage = calcAvg(nonTechScores);
  const now = new Date().toISOString();

  const sb = getSupabase();
  if (sb) {
    // 1. Resolve Target HR (Ensuring valid HR account, excluding Amar)
    let targetHrId = submission.hrId;
    let hrAccount: any = null;

    const { data: allHrs } = await sb.from('hr_accounts').select('id, name');
    const validHrs = (allHrs || []).filter((h: any) => !h.name?.toLowerCase().includes('amar'));

    if (targetHrId && validHrs.some((h: any) => h.id === targetHrId)) {
      hrAccount = validHrs.find((h: any) => h.id === targetHrId);
    }

    // 2. Resolve or dynamically auto-create interview slot to guarantee foreign key constraint
    let realInterviewId = submission.interviewId;
    let slotRecord: any = null;
    const isInterviewUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realInterviewId);

    if (isInterviewUuid) {
      const { data: slotById } = await sb
        .from('interview_schedules')
        .select('*')
        .eq('id', realInterviewId)
        .maybeSingle();
      if (slotById) {
        slotRecord = slotById;
      }
    }

    // If not found by slot id, check if applicant already has a scheduled slot
    if (!slotRecord) {
      const targetAppId = submission.applicantId || (isInterviewUuid ? realInterviewId : null);
      if (targetAppId) {
        const { data: slotByApp } = await sb
          .from('interview_schedules')
          .select('*')
          .eq('applicant_id', targetAppId)
          .maybeSingle();
        if (slotByApp) {
          slotRecord = slotByApp;
          realInterviewId = slotByApp.id;
        }
      }
    }

    // If still unresolved HR, check the slot's HR
    if (!hrAccount && slotRecord?.hr_id && validHrs.some((h: any) => h.id === slotRecord.hr_id)) {
      targetHrId = slotRecord.hr_id;
      hrAccount = validHrs.find((h: any) => h.id === slotRecord.hr_id);
    }
    // If still not resolved, assign first available non-Amar HR
    if (!hrAccount) {
      if (validHrs.length > 0) {
        targetHrId = validHrs[0].id;
        hrAccount = validHrs[0];
      } else {
        targetHrId = '00000000-0000-0000-0000-000000000001';
      }
    }

    // If slot still doesn't exist in interview_schedules, create it on the fly!
    if (!slotRecord) {
      const targetAppId = submission.applicantId || realInterviewId;
      const today = new Date().toISOString().split('T')[0];
      const nowTime = new Date().toTimeString().slice(0, 5);
      const endTime = new Date(Date.now() + 15 * 60000).toTimeString().slice(0, 5);

      const { data: newSlot } = await sb
        .from('interview_schedules')
        .insert({
          applicant_id: targetAppId,
          hr_id: targetHrId,
          date: today,
          start_time: nowTime,
          end_time: endTime,
          duration_minutes: 15,
          interview_mode: 'OFFLINE',
          status: 'IN_PROGRESS',
        })
        .select('*')
        .maybeSingle();

      if (newSlot) {
        slotRecord = newSlot;
        realInterviewId = newSlot.id;
      } else {
        const { data: retrySlot } = await sb
          .from('interview_schedules')
          .select('*')
          .eq('applicant_id', targetAppId)
          .maybeSingle();
        if (retrySlot) {
          slotRecord = retrySlot;
          realInterviewId = retrySlot.id;
        }
      }
    }

    // 3. Clean up any prior evaluations for this interview slot OR this applicant to avoid unique constraint collisions
    const { data: existingEvals } = await sb
      .from('evaluations')
      .select('id')
      .or(`interview_id.eq.${realInterviewId},applicant_id.eq.${submission.applicantId}`);

    if (existingEvals && existingEvals.length > 0) {
      for (const ev of existingEvals) {
        await sb.from('evaluation_scores').delete().eq('evaluation_id', ev.id);
        await sb.from('evaluations').delete().eq('id', ev.id);
      }
    }

    // 4. Insert evaluation referencing valid realInterviewId
    const targetStatus = submission.completionStatus || submission.status || 'COMPLETED';
    const evalId = crypto.randomUUID();
    const { error: evalErr } = await sb.from('evaluations').insert({
      id: evalId,
      interview_id: realInterviewId,
      applicant_id: submission.applicantId,
      hr_id: targetHrId,
      general_notes: submission.generalNotes || '',
      tech_notes: submission.techNotes || '',
      non_tech_notes: submission.nonTechNotes || '',
      general_average: generalAverage,
      tech_average: techAverage,
      non_tech_average: nonTechAverage,
      status: targetStatus,
      submitted_at: now,
    });

    if (evalErr) throw new Error(evalErr.message);

    // Build score rows — both numerical scores and text responses
    const scoreRows: any[] = [];
    for (const [critId, scoreVal] of Object.entries(submission.scores)) {
      scoreRows.push({
        evaluation_id: evalId,
        criterion_id: critId,
        score: scoreVal,
        text_response: null,
      });
    }
    // Add paragraph text responses
    if (submission.textResponses) {
      for (const [critId, textVal] of Object.entries(submission.textResponses)) {
        if (!textVal || textVal.trim() === '') continue;
        const existing = scoreRows.find((r) => r.criterion_id === critId);
        if (existing) {
          existing.text_response = textVal;
        } else {
          scoreRows.push({
            evaluation_id: evalId,
            criterion_id: critId,
            score: null,
            text_response: textVal,
          });
        }
      }
    }

    if (scoreRows.length > 0) {
      await sb.from('evaluation_scores').insert(scoreRows);
    }

    await sb
      .from('interview_schedules')
      .update({ status: targetStatus, updated_at: now })
      .eq('id', realInterviewId);

    logAudit('HR', hrAccount ? hrAccount.name : 'Executive Administrator', 'SUBMIT_EVALUATION', {
      applicantId: submission.applicantId,
      generalAverage,
      techAverage,
      nonTechAverage,
      status: targetStatus,
    });
    invalidateCache('applicants');
    invalidateCache('stats');
    invalidateCache('schedule_slots');
    return;
  }

  const store = readStore();
  let slot = (store.interviewSchedules || []).find((s: any) => s.id === submission.interviewId);
  if (!slot) {
    slot = (store.interviewSchedules || []).find(
      (s: any) => s.applicantId === submission.applicantId || s.applicantId === submission.interviewId
    );
  }
  if (!slot) {
    slot = {
      id: crypto.randomUUID(),
      applicantId: submission.applicantId,
      hrId: submission.hrId,
      date: new Date().toISOString().split('T')[0],
      startTime: new Date().toTimeString().slice(0, 5),
      endTime: new Date(Date.now() + 15 * 60000).toTimeString().slice(0, 5),
      durationMinutes: 15,
      interviewMode: 'OFFLINE',
      status: 'IN_PROGRESS',
    };
    store.interviewSchedules = store.interviewSchedules || [];
    store.interviewSchedules.push(slot);
  }

  const realSlotId = slot.id;
  const evalId = crypto.randomUUID();
  const targetStatus = submission.completionStatus || submission.status || 'COMPLETED';
  store.evaluations = (store.evaluations || []).filter(
    (e: any) => e.interviewId !== realSlotId && e.applicantId !== submission.applicantId
  );
  store.evaluationScores = (store.evaluationScores || []).filter((es: any) => es.evaluationId !== evalId);

  const newEval = {
    id: evalId,
    interviewId: realSlotId,
    applicantId: submission.applicantId,
    hrId: submission.hrId,
    generalNotes: submission.generalNotes || '',
    techNotes: submission.techNotes || '',
    nonTechNotes: submission.nonTechNotes || '',
    generalAverage,
    techAverage,
    nonTechAverage,
    submittedAt: now,
    status: targetStatus,
  };

  store.evaluations.push(newEval);

  for (const [critId, scoreVal] of Object.entries(submission.scores)) {
    store.evaluationScores.push({
      id: crypto.randomUUID(),
      evaluationId: evalId,
      criterionId: critId,
      score: scoreVal,
      textResponse: null,
    });
  }

  if (submission.textResponses) {
    for (const [critId, textVal] of Object.entries(submission.textResponses)) {
      if (!textVal || textVal.trim() === '') continue;
      const existing = store.evaluationScores.find((es: any) => es.evaluationId === evalId && es.criterionId === critId);
      if (existing) {
        existing.textResponse = textVal;
      } else {
        store.evaluationScores.push({
          id: crypto.randomUUID(),
          evaluationId: evalId,
          criterionId: critId,
          score: null,
          textResponse: textVal,
        });
      }
    }
  }

  slot.status = targetStatus;
  writeStore(store);

  const hr = (store.hrAccounts || []).find((h: any) => h.id === submission.hrId);
  logAudit('HR', hr ? hr.name : 'HR', 'SUBMIT_EVALUATION', {
    applicantId: submission.applicantId,
    generalAverage,
    techAverage,
    nonTechAverage,
    status: targetStatus,
  });
}

// ── SCHEDULE MANAGEMENT ─────────────────────────────────────────────

export async function listScheduleSlots(): Promise<InterviewScheduleSlot[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      const [
        { data: slots },
        { data: apps },
        { data: hrs },
        { data: heads },
        { data: appTeams },
        { data: adminUsers },
        { data: evals },
      ] = await Promise.all([
        sb.from('interview_schedules').select('*').order('date', { ascending: true }),
        sb.from('applicants').select('*'),
        sb.from('hr_accounts').select('*'),
        sb.from('interview_heads').select('*'),
        sb.from('applicant_teams').select('*'),
        sb.from('admins').select('id, name, username'),
        sb.from('evaluations').select('id, interview_id, applicant_id, general_average, tech_average, non_tech_average'),
      ]);

      return (slots || []).map((slot: any) => {
        const applicant = (apps || []).find((a: any) => a.id === slot.applicant_id);
        const hr = (hrs || []).find((h: any) => h.id === slot.hr_id)
          || (adminUsers || []).find((a: any) => a.id === slot.hr_id);
        const slotHeads = (heads || []).filter((ih: any) => ih.interview_id === slot.id);

        const teamLinks = (appTeams || []).filter((at: any) => at.applicant_id === slot.applicant_id);
        const teamNames: string[] = [];
        for (const tl of teamLinks) {
          const t = findTeam(tl.team_id);
          if (t) teamNames.push(t.name);
        }

        const evalRecord = (evals || []).find((e: any) => e.interview_id === slot.id || e.applicant_id === slot.applicant_id);
        const genAvg = evalRecord && evalRecord.general_average !== null && evalRecord.general_average !== undefined ? Number(evalRecord.general_average) : null;
        const techAvg = evalRecord && evalRecord.tech_average !== null && evalRecord.tech_average !== undefined ? Number(evalRecord.tech_average) : null;
        const nonTechAvg = evalRecord && evalRecord.non_tech_average !== null && evalRecord.non_tech_average !== undefined ? Number(evalRecord.non_tech_average) : null;
        const validScores = [genAvg, techAvg, nonTechAvg].filter((v): v is number => v !== null && !isNaN(v));
        const totalAvg = validScores.length > 0
          ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 100) / 100
          : null;
        const isSlotCompleted = slot.status === 'COMPLETED' || Boolean(evalRecord);

        return {
          id: slot.id,
          applicantId: slot.applicant_id,
          applicantName: applicant ? applicant.full_name : 'Unknown Applicant',
          applicantEmail: applicant ? applicant.email : '',
          applicantPhone: applicant ? applicant.phone_number : '',
          applicantFaculty: applicant ? (applicant.faculty || applicant.college || '') : '',
          appliedTeams: teamNames,
          hrId: slot.hr_id,
          hrName: hr ? cleanHRName(hr.name) : 'Unknown HR',
          assignedHeadNames: slotHeads.map((h: any) => h.head_name),
          date: slot.date,
          startTime: slot.start_time,
          endTime: slot.end_time,
          durationMinutes: slot.duration_minutes,
          status: isSlotCompleted ? 'COMPLETED' : slot.status,
          evaluationStatus: isSlotCompleted ? 'COMPLETED' : 'PENDING',
          generalAverage: genAvg,
          techAverage: techAvg,
          nonTechAverage: nonTechAvg,
          totalAverage: totalAvg,
          isManualOverride: slot.is_manual_override,
          interviewMode: slot.interview_mode || 'ONLINE',
          location: slot.location,
          meetingLink: slot.meeting_link,
          venueId: slot.venue_id || undefined,
          meetingLinkId: slot.meeting_link_id || undefined,
          whatsappStatus: slot.whatsapp_status || 'NOT_SENT',
          lastSentDate: slot.last_sent_date || undefined,
          lastSentStartTime: slot.last_sent_start_time || undefined,
          lastSentEndTime: slot.last_sent_end_time || undefined,
          lastSentLocation: slot.last_sent_location || undefined,
          lastSentMeetingLink: slot.last_sent_meeting_link || undefined,
          whatsappSentAt: slot.whatsapp_sent_at || undefined,
          activeInterviewerId: slot.active_interviewer_id || undefined,
          activeInterviewerName: slot.active_interviewer_name || undefined,
          lastActiveAt: slot.last_active_at || undefined,
        };
      });
    } catch (e) {
      console.warn('[DB:Supabase] listScheduleSlots error, fallback:', e);
    }
  }

  const store = readStore();
  return (store.interviewSchedules || []).map((slot: any) => {
    const applicant = (store.applicants || []).find((a: any) => a.id === slot.applicantId);
    const hr = (store.hrAccounts || []).find((h: any) => h.id === slot.hrId);
    const heads = (store.interviewHeads || []).filter((ih: any) => ih.interviewId === slot.id);

    const teamLinks = (store.applicantTeams || []).filter((at: any) => at.applicantId === slot.applicantId);
    const teamNames: string[] = [];
    for (const tl of teamLinks) {
      const t = findTeam(tl.teamId);
      if (t) teamNames.push(t.name);
    }

    const evalRecord = (store.evaluations || []).find((e: any) => e.interviewId === slot.id || e.applicantId === slot.applicantId);
    const genAvg = evalRecord && evalRecord.generalAverage !== null && evalRecord.generalAverage !== undefined ? Number(evalRecord.generalAverage) : null;
    const techAvg = evalRecord && evalRecord.techAverage !== null && evalRecord.techAverage !== undefined ? Number(evalRecord.techAverage) : null;
    const nonTechAvg = evalRecord && evalRecord.nonTechAverage !== null && evalRecord.nonTechAverage !== undefined ? Number(evalRecord.nonTechAverage) : null;
    const validScores = [genAvg, techAvg, nonTechAvg].filter((v): v is number => v !== null && !isNaN(v));
    const totalAvg = validScores.length > 0
      ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 100) / 100
      : null;
    const isSlotCompleted = slot.status === 'COMPLETED' || Boolean(evalRecord);

    return {
      id: slot.id,
      applicantId: slot.applicantId,
      applicantName: applicant ? applicant.fullName : 'Unknown Applicant',
      applicantEmail: applicant ? applicant.email : '',
      applicantPhone: applicant ? applicant.phoneNumber : '',
      applicantFaculty: applicant ? (applicant.faculty || applicant.college || '') : '',
      appliedTeams: teamNames,
      hrId: slot.hrId,
      hrName: hr ? hr.name : 'Unknown HR',
      assignedHeadNames: heads.map((h: any) => h.headName),
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      durationMinutes: slot.durationMinutes,
      status: isSlotCompleted ? 'COMPLETED' : slot.status,
      evaluationStatus: isSlotCompleted ? 'COMPLETED' : 'PENDING',
      generalAverage: genAvg,
      techAverage: techAvg,
      nonTechAverage: nonTechAvg,
      totalAverage: totalAvg,
      isManualOverride: slot.isManualOverride,
      interviewMode: slot.interviewMode || 'ONLINE',
      location: slot.location,
      meetingLink: slot.meetingLink,
      venueId: slot.venueId || undefined,
      meetingLinkId: slot.meetingLinkId || undefined,
      whatsappStatus: slot.whatsappStatus || 'NOT_SENT',
      lastSentDate: slot.lastSentDate || undefined,
      lastSentStartTime: slot.lastSentStartTime || undefined,
      lastSentEndTime: slot.lastSentEndTime || undefined,
      lastSentLocation: slot.lastSentLocation || undefined,
      lastSentMeetingLink: slot.lastSentMeetingLink || undefined,
      whatsappSentAt: slot.whatsappSentAt || undefined,
    };
  });
}

export async function saveGeneratedSchedule(
  slots: Array<{
    applicantId: string;
    hrId: string;
    date: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    assignedHeads: Array<{ name: string; category: string }>;
    interviewMode?: 'ONLINE' | 'OFFLINE';
    location?: string;
    meetingLink?: string;
  }>
): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    const now = new Date().toISOString();
    for (const s of slots) {
      // Safely delete any existing slot specifically for this applicant to prevent duplicate slots
      const { data: existingAppSlots } = await sb
        .from('interview_schedules')
        .select('id')
        .eq('applicant_id', s.applicantId);
      if (existingAppSlots && existingAppSlots.length > 0) {
        const oldIds = existingAppSlots.map((x: any) => x.id);
        await sb.from('interview_heads').delete().in('interview_id', oldIds);
        await sb.from('interview_schedules').delete().in('id', oldIds);
      }

      const interviewId = crypto.randomUUID();
      await sb.from('interview_schedules').insert({
        id: interviewId,
        applicant_id: s.applicantId,
        hr_id: s.hrId,
        date: s.date,
        start_time: s.startTime,
        end_time: s.endTime,
        duration_minutes: s.durationMinutes,
        status: 'SCHEDULED',
        is_manual_override: false,
        interview_mode: s.interviewMode || 'ONLINE',
        location: s.location || (s.interviewMode === 'OFFLINE' ? 'ECU Campus - Main Building' : null),
        meeting_link: s.meetingLink || (s.interviewMode === 'ONLINE' ? 'Google Meet (Link will be sent prior to interview)' : null),
        created_at: now,
        updated_at: now,
      });

      if (s.assignedHeads && s.assignedHeads.length > 0) {
        const headRows = s.assignedHeads.map((h) => ({
          interview_id: interviewId,
          head_name: h.name,
          head_category: h.category,
        }));
        await sb.from('interview_heads').insert(headRows);
      }
    }

    logAudit('ADMIN', 'Executive Administrator', 'GENERATE_SCHEDULE', { slotCount: slots.length });
    return;
  }

  const store = readStore();
  if (!store.interviewSchedules) store.interviewSchedules = [];
  if (!store.interviewHeads) store.interviewHeads = [];

  for (const s of slots) {
    store.interviewSchedules = store.interviewSchedules.filter((x: any) => x.applicantId !== s.applicantId);
    const interviewId = crypto.randomUUID();
    store.interviewSchedules.push({
      id: interviewId,
      applicantId: s.applicantId,
      hrId: s.hrId,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      durationMinutes: s.durationMinutes,
      status: 'SCHEDULED',
      isManualOverride: false,
      interviewMode: s.interviewMode || 'ONLINE',
      location: s.location || (s.interviewMode === 'OFFLINE' ? 'ECU Campus - Main Building' : undefined),
      meetingLink: s.meetingLink || (s.interviewMode === 'ONLINE' ? 'Google Meet (Link will be sent prior to interview)' : undefined),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    for (const head of s.assignedHeads) {
      store.interviewHeads.push({
        id: crypto.randomUUID(),
        interviewId,
        headName: head.name,
        headCategory: head.category,
      });
    }
  }

  writeStore(store);
  logAudit('ADMIN', 'Executive Administrator', 'GENERATE_SCHEDULE', { slotCount: slots.length });
}

export async function updateScheduleSlotManual(
  slotId: string,
  updates: {
    hrId?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    interviewMode?: 'ONLINE' | 'OFFLINE';
    location?: string;
    meetingLink?: string;
    venueId?: string;
    meetingLinkId?: string;
    whatsappStatus?: 'NOT_SENT' | 'SENT' | 'RESCHEDULED_PENDING';
  }
): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    const { data: currentSlot } = await sb
      .from('interview_schedules')
      .select('*')
      .eq('id', slotId)
      .maybeSingle();

    const payload: any = {
      is_manual_override: true,
      updated_at: new Date().toISOString(),
    };
    if (updates.hrId) payload.hr_id = updates.hrId;
    if (updates.date) payload.date = updates.date;
    if (updates.startTime) payload.start_time = updates.startTime;
    if (updates.endTime) payload.end_time = updates.endTime;
    if (updates.interviewMode) payload.interview_mode = updates.interviewMode;
    if (updates.location !== undefined) payload.location = updates.location;
    if (updates.meetingLink !== undefined) payload.meeting_link = updates.meetingLink;
    if (updates.venueId !== undefined) payload.venue_id = updates.venueId;
    if (updates.meetingLinkId !== undefined) payload.meeting_link_id = updates.meetingLinkId;

    if (updates.whatsappStatus) {
      payload.whatsapp_status = updates.whatsappStatus;
    } else if (currentSlot && currentSlot.whatsapp_status === 'SENT') {
      const timeChanged = updates.startTime && updates.startTime !== currentSlot.start_time;
      const endTimeChanged = updates.endTime && updates.endTime !== currentSlot.end_time;
      const dateChanged = updates.date && updates.date !== currentSlot.date;
      const locChanged = updates.location !== undefined && updates.location !== currentSlot.location;
      const linkChanged = updates.meetingLink !== undefined && updates.meetingLink !== currentSlot.meeting_link;
      const modeChanged = updates.interviewMode && updates.interviewMode !== currentSlot.interview_mode;

      if (timeChanged || endTimeChanged || dateChanged || locChanged || linkChanged || modeChanged) {
        payload.whatsapp_status = 'RESCHEDULED_PENDING';
      }
    }

    await sb.from('interview_schedules').update(payload).eq('id', slotId);
    logAudit('ADMIN', 'Executive Administrator', 'MANUAL_MOVE_INTERVIEW', { slotId, updates });
    return;
  }

  const store = readStore();
  const slot = (store.interviewSchedules || []).find((s: any) => s.id === slotId);
  if (!slot) throw new Error('Slot not found.');

  const wasSent = slot.whatsappStatus === 'SENT';

  if (updates.hrId) slot.hrId = updates.hrId;
  if (updates.date) slot.date = updates.date;
  if (updates.startTime) slot.startTime = updates.startTime;
  if (updates.endTime) slot.endTime = updates.endTime;
  if (updates.interviewMode) slot.interviewMode = updates.interviewMode;
  if (updates.location !== undefined) slot.location = updates.location;
  if (updates.meetingLink !== undefined) slot.meetingLink = updates.meetingLink;
  if (updates.venueId !== undefined) slot.venueId = updates.venueId;
  if (updates.meetingLinkId !== undefined) slot.meetingLinkId = updates.meetingLinkId;

  if (updates.whatsappStatus) {
    slot.whatsappStatus = updates.whatsappStatus;
  } else if (wasSent) {
    const timeChanged = updates.startTime && updates.startTime !== slot.lastSentStartTime;
    const dateChanged = updates.date && updates.date !== slot.lastSentDate;
    const locChanged = updates.location !== undefined && updates.location !== slot.lastSentLocation;
    if (timeChanged || dateChanged || locChanged) {
      slot.whatsappStatus = 'RESCHEDULED_PENDING';
    }
  }

  slot.isManualOverride = true;
  slot.updatedAt = new Date().toISOString();

  writeStore(store);
  logAudit('ADMIN', 'Executive Administrator', 'MANUAL_MOVE_INTERVIEW', { slotId, updates });
}

export async function markScheduleSlotWhatsAppSent(
  slotId: string,
  snapshot: {
    date: string;
    startTime: string;
    endTime: string;
    location?: string;
    meetingLink?: string;
    interviewMode?: 'ONLINE' | 'OFFLINE';
  }
): Promise<void> {
  const now = new Date().toISOString();
  const sb = getSupabase();
  if (sb) {
    await sb.from('interview_schedules').update({
      whatsapp_status: 'SENT',
      whatsapp_sent_at: now,
      last_sent_date: snapshot.date,
      last_sent_start_time: snapshot.startTime,
      last_sent_end_time: snapshot.endTime,
      last_sent_location: snapshot.location || '',
      last_sent_meeting_link: snapshot.meetingLink || '',
      last_sent_mode: snapshot.interviewMode || 'ONLINE',
      updated_at: now,
    }).eq('id', slotId);
    invalidateCache('schedule_slots');
    invalidateCache('applicants');
    return;
  }

  const store = readStore();
  const slot = (store.interviewSchedules || []).find((s: any) => s.id === slotId);
  if (slot) {
    slot.whatsappStatus = 'SENT';
    slot.whatsappSentAt = now;
    slot.lastSentDate = snapshot.date;
    slot.lastSentStartTime = snapshot.startTime;
    slot.lastSentEndTime = snapshot.endTime;
    slot.lastSentLocation = snapshot.location;
    slot.lastSentMeetingLink = snapshot.meetingLink;
    slot.lastSentMode = snapshot.interviewMode;
    slot.updatedAt = now;
    writeStore(store);
    invalidateCache('schedule_slots');
    invalidateCache('applicants');
  }
}

export async function setScheduleSlotWhatsAppStatus(
  slotId: string,
  status: 'SENT' | 'NOT_SENT' | 'RESCHEDULED_PENDING'
): Promise<void> {
  const now = new Date().toISOString();
  const sb = getSupabase();
  if (sb) {
    await sb.from('interview_schedules').update({
      whatsapp_status: status,
      whatsapp_sent_at: status === 'SENT' ? now : null,
      updated_at: now,
    }).eq('id', slotId);
    invalidateCache('schedule_slots');
    invalidateCache('applicants');
    return;
  }

  const store = readStore();
  const slot = (store.interviewSchedules || []).find((s: any) => s.id === slotId);
  if (slot) {
    slot.whatsappStatus = status;
    slot.whatsappSentAt = status === 'SENT' ? now : undefined;
    slot.updatedAt = now;
    writeStore(store);
    invalidateCache('schedule_slots');
    invalidateCache('applicants');
  }
}

export async function removeScheduleSlot(slotId: string): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    await sb.from('interview_heads').delete().eq('interview_id', slotId);
    await sb.from('interview_schedules').delete().eq('id', slotId);
    logAudit('ADMIN', 'Executive Administrator', 'REMOVE_INTERVIEW_SLOT', { slotId });
    return;
  }

  const store = readStore();
  store.interviewSchedules = (store.interviewSchedules || []).filter((s: any) => s.id !== slotId);
  store.interviewHeads = (store.interviewHeads || []).filter((ih: any) => ih.interviewId !== slotId);
  writeStore(store);
  logAudit('ADMIN', 'Executive Administrator', 'REMOVE_INTERVIEW_SLOT', { slotId });
}

export async function removeScheduleSlots(slotIds: string[]): Promise<void> {
  if (!slotIds || slotIds.length === 0) return;
  const sb = getSupabase();
  if (sb) {
    await sb.from('interview_heads').delete().in('interview_id', slotIds);
    await sb.from('interview_schedules').delete().in('id', slotIds);
    logAudit('ADMIN', 'Executive Administrator', 'REMOVE_INTERVIEW_SLOTS_BATCH', { count: slotIds.length, slotIds });
    return;
  }

  const store = readStore();
  const idSet = new Set(slotIds);
  store.interviewSchedules = (store.interviewSchedules || []).filter((s: any) => !idSet.has(s.id));
  store.interviewHeads = (store.interviewHeads || []).filter((ih: any) => !idSet.has(ih.interviewId));
  writeStore(store);
  logAudit('ADMIN', 'Executive Administrator', 'REMOVE_INTERVIEW_SLOTS_BATCH', { count: slotIds.length, slotIds });
}

export async function setScheduleSlotStatus(
  slotId: string,
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW',
  actorName: string = 'Executive Administrator'
): Promise<void> {
  const now = new Date().toISOString();
  const sb = getSupabase();
  if (sb) {
    await sb
      .from('interview_schedules')
      .update({
        status,
        updated_at: now,
      })
      .eq('id', slotId);
    invalidateCache('schedule_slots');
    invalidateCache('applicants');
    logAudit('ADMIN', actorName, 'SET_SLOT_STATUS', { slotId, status });
    return;
  }

  const store = readStore();
  const slot = (store.interviewSchedules || []).find((s: any) => s.id === slotId);
  if (slot) {
    slot.status = status;
    slot.updatedAt = now;
    writeStore(store);
  }
}

export async function recordInterviewHeartbeat(
  interviewId: string,
  hrId: string,
  hrName: string
): Promise<{
  collision: boolean;
  activeInterviewer?: { id: string; name: string; secondsAgo: number };
}> {
  const sb = getSupabase();
  const now = new Date();
  if (sb) {
    const { data: slot } = await sb
      .from('interview_schedules')
      .select('active_interviewer_id, active_interviewer_name, last_active_at')
      .eq('id', interviewId)
      .maybeSingle();

    let collision = false;
    let activeInterviewer: { id: string; name: string; secondsAgo: number } | undefined;

    if (slot && slot.active_interviewer_id && slot.last_active_at) {
      const lastActive = new Date(slot.last_active_at);
      const diffSeconds = Math.floor((now.getTime() - lastActive.getTime()) / 1000);

      // If active within the last 45 seconds by a different HR
      if (diffSeconds < 45 && slot.active_interviewer_id !== hrId) {
        collision = true;
        activeInterviewer = {
          id: slot.active_interviewer_id,
          name: slot.active_interviewer_name || 'Another HR',
          secondsAgo: diffSeconds,
        };
      }
    }

    // Update active heartbeat for current HR
    await sb
      .from('interview_schedules')
      .update({
        active_interviewer_id: hrId,
        active_interviewer_name: hrName,
        last_active_at: now.toISOString(),
      })
      .eq('id', interviewId);

    return { collision, activeInterviewer };
  }

  return { collision: false };
}

export async function releaseInterviewHeartbeat(
  interviewId: string,
  hrId: string
): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    await sb
      .from('interview_schedules')
      .update({
        active_interviewer_id: null,
        active_interviewer_name: null,
        last_active_at: null,
      })
      .eq('id', interviewId)
      .eq('active_interviewer_id', hrId);
  }
}

export async function getRecruitmentStatus(): Promise<'OPEN' | 'CLOSED'> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data } = await sb
        .from('system_settings')
        .select('value')
        .eq('key', 'recruitment_status')
        .maybeSingle();
      if (data && data.value) {
        const val = typeof data.value === 'string' ? data.value.replace(/"/g, '') : data.value;
        if (val === 'OPEN' || val === 'CLOSED') {
          return val as 'OPEN' | 'CLOSED';
        }
      }
    } catch (e) {
      console.warn('[DB] getRecruitmentStatus error:', e);
    }
  }
  return 'OPEN';
}

export async function setRecruitmentStatus(
  status: 'OPEN' | 'CLOSED',
  actorName: string = 'Executive Administrator'
): Promise<void> {
  const sb = getSupabase();
  const now = new Date().toISOString();
  if (sb) {
    await sb.from('system_settings').upsert({
      key: 'recruitment_status',
      value: JSON.stringify(status),
      updated_at: now,
    });
    invalidateCache('stats');
    logAudit('ADMIN', actorName, 'SET_RECRUITMENT_STATUS', { status });
  }
}

export async function getCommitteeQuotas(): Promise<Record<string, number>> {
  const defaultQuotas: Record<string, number> = {
    'software': 15,
    'hardware': 12,
    'general-tech': 15,
    'visuals': 10,
    'graphics': 10,
    'marketing': 12,
    'hr': 10,
    'events': 12,
    'pr-logistics': 15,
  };
  const sb = getSupabase();
  if (sb) {
    try {
      const { data } = await sb
        .from('system_settings')
        .select('value')
        .eq('key', 'committee_quotas')
        .maybeSingle();
      if (data && data.value && typeof data.value === 'object') {
        return { ...defaultQuotas, ...data.value };
      }
    } catch (e) {
      console.warn('[DB] getCommitteeQuotas error:', e);
    }
  }
  return defaultQuotas;
}

export async function saveCommitteeQuotas(
  quotas: Record<string, number>,
  actorName: string = 'Executive Administrator'
): Promise<void> {
  const sb = getSupabase();
  const now = new Date().toISOString();
  if (sb) {
    await sb.from('system_settings').upsert({
      key: 'committee_quotas',
      value: quotas,
      updated_at: now,
    });
    invalidateCache('stats');
    logAudit('ADMIN', actorName, 'SAVE_COMMITTEE_QUOTAS', { quotas });
  }
}

// ── WHATSAPP & VENUE GOVERNANCE ─────────────────────────────────────

export const DEFAULT_WHATSAPP_GROUP_LINKS: WhatsAppGroupLinks = {
  familyLink: 'https://chat.whatsapp.com/IEEE-ECU-Family-2026',
  techMegaLink: 'https://chat.whatsapp.com/IEEE-ECU-Tech-Mega-2026',
  mediaMegaLink: 'https://chat.whatsapp.com/IEEE-ECU-Media-Mega-2026',
  teamLinks: {
    'general-tech': 'https://chat.whatsapp.com/IEEE-ECU-General-Tech',
    'software': 'https://chat.whatsapp.com/IEEE-ECU-Software-Team',
    'hardware': 'https://chat.whatsapp.com/IEEE-ECU-Hardware-Team',
    'pr-logistics': 'https://chat.whatsapp.com/IEEE-ECU-PR-Logistics',
    'events': 'https://chat.whatsapp.com/IEEE-ECU-Events-Team',
    'hr': 'https://chat.whatsapp.com/IEEE-ECU-HR-Team',
    'visuals': 'https://chat.whatsapp.com/IEEE-ECU-Visuals-Team',
    'graphics': 'https://chat.whatsapp.com/IEEE-ECU-Graphics-Team',
    'marketing': 'https://chat.whatsapp.com/IEEE-ECU-Marketing-Team',
  },
};

export async function getWhatsAppGroupLinks(): Promise<WhatsAppGroupLinks> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data } = await sb.from('system_settings').select('value').eq('key', 'whatsapp_group_links').maybeSingle();
      if (data && data.value) {
        return {
          ...DEFAULT_WHATSAPP_GROUP_LINKS,
          ...data.value,
          teamLinks: { ...DEFAULT_WHATSAPP_GROUP_LINKS.teamLinks, ...(data.value.teamLinks || {}) },
        };
      }
    } catch (e) {
      console.warn('[DB] getWhatsAppGroupLinks fallback:', e);
    }
  }

  const store = readStore();
  return store.whatsappGroupLinks || DEFAULT_WHATSAPP_GROUP_LINKS;
}

export async function saveWhatsAppGroupLinks(links: WhatsAppGroupLinks): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    await sb.from('system_settings').upsert({
      key: 'whatsapp_group_links',
      value: links,
      updated_at: new Date().toISOString(),
    });
    logAudit('ADMIN', 'Executive Administrator', 'UPDATE_WHATSAPP_LINKS', { updated: true });
    return;
  }

  const store = readStore();
  store.whatsappGroupLinks = links;
  writeStore(store);
  logAudit('ADMIN', 'Executive Administrator', 'UPDATE_WHATSAPP_LINKS', { updated: true });
}

export const DEFAULT_VENUES: VenueDefinition[] = [
  { id: 'v-1', name: 'ECU Campus — Building B, Room 204 (Tech Lab)', type: 'OFFLINE', details: 'Building B - 2nd Floor' },
  { id: 'v-2', name: 'ECU Campus — Building B, Room 205 (Hardware Lab)', type: 'OFFLINE', details: 'Building B - 2nd Floor' },
  { id: 'v-3', name: 'ECU Campus — Building A, Room 102 (PR & Events)', type: 'OFFLINE', details: 'Building A - 1st Floor' },
  { id: 'v-4', name: 'ECU Campus — Building A, Room 103 (HR Room)', type: 'OFFLINE', details: 'Building A - 1st Floor' },
  { id: 'v-5', name: 'ECU Campus — Main Auditorium (Media)', type: 'OFFLINE', details: 'Main Building - Ground Floor' },
  { id: 'v-6', name: 'Google Meet — Tech Track (meet.google.com/abc-tech-ecu)', type: 'ONLINE', details: 'Online Link' },
  { id: 'v-7', name: 'Google Meet — Non-Tech Track (meet.google.com/def-ops-ecu)', type: 'ONLINE', details: 'Online Link' },
];

export async function listVenues(): Promise<VenueDefinition[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data } = await sb.from('system_settings').select('value').eq('key', 'venues').maybeSingle();
      if (data && Array.isArray(data.value) && data.value.length > 0) {
        return data.value;
      }
    } catch (e) {
      console.warn('[DB] listVenues fallback:', e);
    }
  }

  const store = readStore();
  return store.venues || DEFAULT_VENUES;
}

export async function saveVenues(venues: VenueDefinition[]): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    await sb.from('system_settings').upsert({
      key: 'venues',
      value: venues,
      updated_at: new Date().toISOString(),
    });
    logAudit('ADMIN', 'Executive Administrator', 'UPDATE_VENUES', { count: venues.length });
    return;
  }

  const store = readStore();
  store.venues = venues;
  writeStore(store);
  logAudit('ADMIN', 'Executive Administrator', 'UPDATE_VENUES', { count: venues.length });
}

export const DEFAULT_WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'INTERVIEW_INVITATION',
    title: 'Interview Invitation / دعوة المقابلة الشخصية',
    template: `مرحبا {{name}}،
من فرع IEEE بالجامعة الصينية المصرية (IEEE ECU Student Branch).
بخصوص تقديمك للانضمام إلى: ({{teams}}).

يسعدنا إبلاغك بموعد المقابلة الشخصية (Interview):
- اليوم: {{date}}
- التوقيت: {{time}}
- المكان: {{venue}}
{{meeting_link_line}}

يرجى الحضور قبل الموعد بـ 10 دقائق.
بالتوفيق،
فريق الموارد البشرية - IEEE ECU SB`,
  },
  {
    id: 'INTERVIEW_RESCHEDULED',
    title: 'Rescheduled Notice / تعديل وتأجيل موعد المقابلة',
    template: `مرحبا {{name}}،
من فرع IEEE بالجامعة الصينية المصرية (IEEE ECU Student Branch).
نود إبلاغك بتعديل موعد المقابلة الشخصية الخاص بك إلى الموعد التالي:

- الموعد الجديد: {{date}}
- التوقيت: {{time}}
- المكان: {{venue}}
{{meeting_link_line}}

نعتذر عن أي تغيير في المواعيد، ونلتقي بك في الموعد المحدد.
فريق الموارد البشرية - IEEE ECU SB`,
  },
  {
    id: 'COMBINED_DECISION',
    title: 'Combined Decision / القرار المجمع (قبول / اعتذار)',
    template: `مرحبا {{name}}،
من فرع IEEE بالجامعة الصينية المصرية (IEEE ECU Student Branch).
بشأن نتائج المقابلات الشخصية لسيزون 2026-2027:

{{decision_body}}

{{links_section}}

مع أطيب التمنيات،
IEEE ECU Student Branch`,
  },
];

export async function listWhatsAppTemplates(): Promise<WhatsAppTemplate[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data } = await sb.from('system_settings').select('value').eq('key', 'whatsapp_templates').maybeSingle();
      if (data && Array.isArray(data.value) && data.value.length > 0) {
        return data.value;
      }
    } catch (e) {
      console.warn('[DB] listWhatsAppTemplates fallback:', e);
    }
  }

  const store = readStore();
  return store.whatsappTemplates || DEFAULT_WHATSAPP_TEMPLATES;
}

export async function saveWhatsAppTemplates(templates: WhatsAppTemplate[]): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    await sb.from('system_settings').upsert({
      key: 'whatsapp_templates',
      value: templates,
      updated_at: new Date().toISOString(),
    });
    logAudit('ADMIN', 'Executive Administrator', 'UPDATE_WHATSAPP_TEMPLATES', { count: templates.length });
    return;
  }

  const store = readStore();
  store.whatsappTemplates = templates;
  writeStore(store);
  logAudit('ADMIN', 'Executive Administrator', 'UPDATE_WHATSAPP_TEMPLATES', { count: templates.length });
}

export function formatEgyptianPhoneForWhatsApp(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('01')) {
    clean = '2' + clean;
  } else if (clean.startsWith('1') && clean.length === 10) {
    clean = '20' + clean;
  } else if (!clean.startsWith('20') && clean.length === 11 && clean.startsWith('0')) {
    clean = '2' + clean;
  }
  return clean;
}

export function generateCombinedWhatsAppDecision(
  applicantName: string,
  decisions: Array<{ teamName: string; category?: string; decision: DecisionStatus }>,
  groupLinks: WhatsAppGroupLinks,
  customTemplateText?: string,
  subTemplates?: Record<string, string>
): string {
  const accepted = decisions.filter((d) => d.decision === 'ACCEPTED');
  const waitlisted = decisions.filter((d) => d.decision === 'WAITLISTED');
  const rejected = decisions.filter((d) => d.decision === 'REJECTED');

  const acceptedNames = accepted.map((a) => a.teamName).join(' و ');
  const waitlistedNames = waitlisted.map((w) => w.teamName).join(' و ');
  const rejectedNames = rejected.map((r) => r.teamName).join(' و ');
  const appliedNames = decisions.map((d) => d.teamName).join(' و ');

  let decisionBody = '';
  let linksSection = '';

  // Customizable Decision Body
  const tmplAccepted =
    subTemplates?.['DECISION_BODY_ACCEPTED'] ||
    'يسعدنا إبلاغك بقبولك رسمياً في لجنة: *{{accepted_teams}}*. نرحب بك في فريق العمل.';
  const tmplPartial =
    subTemplates?.['DECISION_BODY_PARTIAL'] ||
    'يسعدنا إبلاغك بقبولك رسمياً في لجنة: *{{accepted_teams}}*.\nونعتذر عن عدم إمكانية القبول في لجنة: *{{rejected_teams}}* نظراً لمحدودية الأماكن المتاحة.';
  const tmplAcceptedWaitlisted =
    subTemplates?.['DECISION_BODY_ACCEPTED_WAITLISTED'] ||
    'يسعدنا إبلاغك بقبولك رسمياً في لجنة: *{{accepted_teams}}*.\nكما نود إعلامك بأنه تم وضعك في قائمة الانتظار (Waitlist) للجنة: *{{waitlisted_teams}}* وسيتم التواصل معك في حال توفر مقاعد إضافية.';
  const tmplWaitlisted =
    subTemplates?.['DECISION_BODY_WAITLISTED'] ||
    'نشكرك على أدائك في المقابلة الشخصية.\nنود إبلاغك بأنه تم وضعك في قائمة الانتظار (Waitlist) للجنة: *{{waitlisted_teams}}* نظراً لتقارب الدرجات والمفاضلة بين المتقدمين، وسنقوم بالتواصل معك فور توفر مقاعد شاغرة.';
  const tmplRejected =
    subTemplates?.['DECISION_BODY_REJECTED'] ||
    'نشكرك على اهتمامك ووقتك في المقابلة الشخصية للجنة: *{{applied_teams}}*.\nنعتذر عن عدم قبولك في هذا الموسم نظراً لمحدودية الأماكن المتاحة، ونتمنى لك دوام التوفيق والنجاح.';

  if (accepted.length > 0 && waitlisted.length > 0) {
    decisionBody = tmplAcceptedWaitlisted
      .replace(/{{accepted_teams}}/g, acceptedNames)
      .replace(/{{waitlisted_teams}}/g, waitlistedNames);
  } else if (accepted.length > 0 && rejected.length > 0) {
    decisionBody = tmplPartial
      .replace(/{{accepted_teams}}/g, acceptedNames)
      .replace(/{{rejected_teams}}/g, rejectedNames);
  } else if (accepted.length > 0) {
    decisionBody = tmplAccepted.replace(/{{accepted_teams}}/g, acceptedNames);
  } else if (waitlisted.length > 0) {
    decisionBody = tmplWaitlisted
      .replace(/{{waitlisted_teams}}/g, waitlistedNames)
      .replace(/{{applied_teams}}/g, appliedNames);
  } else {
    decisionBody = tmplRejected.replace(/{{applied_teams}}/g, appliedNames);
  }

  // Customizable Links Section
  if (accepted.length > 0) {
    const linksList: string[] = [];
    const header =
      subTemplates?.['LINKS_HEADER'] ||
      'يرجى الانضمام للمجموعات التالية لمتابعة التعليمات:';
    const familyFormat =
      subTemplates?.['LINKS_FAMILY_FORMAT'] ||
      '*مجموعة أعضاء IEEE ECU العامة:*\n{{link}}';
    const techFormat =
      subTemplates?.['LINKS_TECH_FORMAT'] ||
      '*مجموعة الفرق التقنية (Tech):*\n{{link}}';
    const mediaFormat =
      subTemplates?.['LINKS_MEDIA_FORMAT'] ||
      '*مجموعة فرق الميديا (Media):*\n{{link}}';
    const committeeFormat =
      subTemplates?.['LINKS_COMMITTEE_FORMAT'] ||
      '*مجموعة لجنة {{team}}:*\n{{link}}';

    if (groupLinks.familyLink) {
      linksList.push(familyFormat.replace(/{{link}}/g, groupLinks.familyLink));
    }

    const hasTech = accepted.some((a) => {
      const def = findTeam(a.teamName);
      return def?.broadCategory === 'TECH';
    });
    if (hasTech && groupLinks.techMegaLink) {
      linksList.push(techFormat.replace(/{{link}}/g, groupLinks.techMegaLink));
    }

    const hasMedia = accepted.some((a) => {
      const def = findTeam(a.teamName);
      return def?.conceptualCategory === 'MEDIA';
    });
    if (hasMedia && groupLinks.mediaMegaLink) {
      linksList.push(mediaFormat.replace(/{{link}}/g, groupLinks.mediaMegaLink));
    }

    for (const acc of accepted) {
      const teamDef = findTeam(acc.teamName);
      if (teamDef && groupLinks.teamLinks && groupLinks.teamLinks[teamDef.id]) {
        linksList.push(
          committeeFormat
            .replace(/{{team}}/g, acc.teamName)
            .replace(/{{link}}/g, groupLinks.teamLinks[teamDef.id])
        );
      }
    }

    if (linksList.length > 0) {
      linksSection = `${header}\n\n${linksList.join('\n\n')}`;
    }
  }

  const baseTemplate =
    customTemplateText ||
    `مرحبا {{name}}،
من فرع IEEE بالجامعة الصينية المصرية (IEEE ECU Student Branch).
بشأن نتائج المقابلات الشخصية لسيزون 2026-2027:

{{decision_body}}

{{links_section}}

مع أطيب التمنيات،
IEEE ECU Student Branch`;

  const firstName = extractFirstName(applicantName) || applicantName;

  decisionBody = decisionBody
    .replace(/\{\{\s*name\s*\}\}/gi, applicantName)
    .replace(/\{\{\s*(first_name|firstName|first\s*name|الاسم_الاول|الاسم\s*الأول)\s*\}\}/gi, firstName);

  let rendered = baseTemplate
    .replace(/\{\{\s*name\s*\}\}/gi, applicantName)
    .replace(/\{\{\s*(first_name|firstName|first\s*name|الاسم_الاول|الاسم\s*الأول)\s*\}\}/gi, firstName)
    .replace(/\{\{\s*teams\s*\}\}/gi, appliedNames)
    .replace(/\{\{\s*decision_body\s*\}\}/gi, decisionBody)
    .replace(/\{\{\s*links_section\s*\}\}/gi, linksSection)
    .replace(/\{\{\s*accepted_teams\s*\}\}/gi, acceptedNames)
    .replace(/\{\{\s*waitlisted_teams\s*\}\}/gi, waitlistedNames)
    .replace(/\{\{\s*rejected_teams\s*\}\}/gi, rejectedNames)
    .replace(/\{\{\s*applied_teams\s*\}\}/gi, appliedNames);

  // Substitute any custom placeholders defined in subTemplates
  if (subTemplates) {
    for (const [key, val] of Object.entries(subTemplates)) {
      if (key.startsWith('CUSTOM_VAR_')) {
        const varName = key.replace('CUSTOM_VAR_', '').toLowerCase();
        rendered = rendered.replace(new RegExp(`{{\\s*${varName}\\s*}}`, 'gi'), val);
      }
    }
  }

  return formatTimeString12h(rendered.trim());
}

// ── EMAIL TEMPLATES & LOGS ──────────────────────────────────────────

const EMAIL_TYPE_MAP: Record<string, { type: any; title: string }> = {
  INTERVIEW: { type: 'INTERVIEW_INVITATION', title: 'Interview Invitation' },
  INTERVIEW_INVITATION: { type: 'INTERVIEW_INVITATION', title: 'Interview Invitation' },
  ACCEPTANCE: { type: 'ACCEPTANCE', title: 'Candidate Acceptance' },
  REJECTION: { type: 'REJECTION', title: 'Candidate Rejection' },
};

export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from('email_templates').select('*');
      if (!error && data && data.length > 0) {
        return data.map((t: any) => {
          const meta = EMAIL_TYPE_MAP[t.id] || {
            type: (t.type || 'INTERVIEW_INVITATION') as any,
            title: t.title || t.id,
          };
          return {
            id: t.id,
            type: meta.type,
            title: meta.title,
            subject: t.subject,
            bodyHtml: t.body_html,
            updatedAt: t.updated_at,
          };
        });
      }
    } catch (e) {
      console.warn('[DB:Supabase] listEmailTemplates error, fallback:', e);
    }
  }

  const store = readStore();
  return (store.emailTemplates || []).map((t: any) => {
    const meta = EMAIL_TYPE_MAP[t.id] || {
      type: (t.type || 'INTERVIEW_INVITATION') as any,
      title: t.title || t.id,
    };
    return {
      id: t.id,
      type: meta.type,
      title: meta.title,
      subject: t.subject,
      bodyHtml: t.bodyHtml,
      updatedAt: t.updatedAt,
    };
  });
}

export async function updateEmailTemplate(
  id: string,
  subject: string,
  bodyHtml: string
): Promise<EmailTemplate> {
  const now = new Date().toISOString();
  const meta = EMAIL_TYPE_MAP[id] || {
    type: 'INTERVIEW_INVITATION' as any,
    title: id,
  };

  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('email_templates')
      .update({ subject, body_html: bodyHtml, updated_at: now })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    logAudit('ADMIN', 'Executive Administrator', 'UPDATE_EMAIL_TEMPLATE', { templateId: id });
    return {
      id: data.id,
      type: meta.type,
      title: meta.title,
      subject: data.subject,
      bodyHtml: data.body_html,
      updatedAt: data.updated_at,
    };
  }

  const store = readStore();
  const t = (store.emailTemplates || []).find((tmpl: any) => tmpl.id === id);
  if (!t) throw new Error('Template not found.');

  t.subject = subject;
  t.bodyHtml = bodyHtml;
  t.updatedAt = now;

  writeStore(store);
  logAudit('ADMIN', 'Executive Administrator', 'UPDATE_EMAIL_TEMPLATE', { templateId: id });
  return {
    id: t.id,
    type: meta.type,
    title: meta.title,
    subject: t.subject,
    bodyHtml: t.bodyHtml,
    updatedAt: t.updatedAt,
  };
}

export async function listEmailLogs(): Promise<EmailLog[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('email_logs')
        .select('*')
        .order('last_attempted_at', { ascending: false });
      if (!error && data) {
        return data.map((l: any) => ({
          id: l.id,
          recipientEmail: l.recipient_email,
          applicantId: l.applicant_id,
          applicantName: l.applicant_name,
          emailType: l.email_type,
          teamName: l.team_name,
          subject: l.subject,
          status: l.status,
          errorMessage: l.error_message,
          retryCount: l.retry_count || 0,
          lastAttemptedAt: l.last_attempted_at,
          sentAt: l.sent_at,
        }));
      }
    } catch (e) {
      console.warn('[DB:Supabase] listEmailLogs error, fallback:', e);
    }
  }

  const store = readStore();
  return (store.emailLogs || []).sort(
    (a: any, b: any) => new Date(b.lastAttemptedAt).getTime() - new Date(a.lastAttemptedAt).getTime()
  );
}

export async function logEmailAttempt(logEntry: Omit<EmailLog, 'id'>): Promise<EmailLog> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('email_logs')
        .insert({
          recipient_email: logEntry.recipientEmail,
          applicant_id: logEntry.applicantId || null,
          applicant_name: logEntry.applicantName,
          email_type: logEntry.emailType,
          team_name: logEntry.teamName,
          subject: logEntry.subject,
          status: logEntry.status,
          error_message: logEntry.errorMessage || null,
          retry_count: logEntry.retryCount || 0,
          last_attempted_at: logEntry.lastAttemptedAt || new Date().toISOString(),
          sent_at: logEntry.sentAt || null,
        })
        .select('*')
        .single();
      if (!error && data) {
        return {
          id: data.id,
          recipientEmail: data.recipient_email,
          applicantId: data.applicant_id,
          applicantName: data.applicant_name,
          emailType: data.email_type,
          teamName: data.team_name,
          subject: data.subject,
          status: data.status,
          errorMessage: data.error_message,
          retryCount: data.retry_count,
          lastAttemptedAt: data.last_attempted_at,
          sentAt: data.sent_at,
        };
      }
    } catch (e) {
      console.warn('[DB:Supabase] logEmailAttempt error, fallback:', e);
    }
  }

  const store = readStore();
  const newLog: EmailLog = {
    id: crypto.randomUUID(),
    ...logEntry,
  };
  store.emailLogs = store.emailLogs || [];
  store.emailLogs.push(newLog);
  writeStore(store);
  return newLog;
}

export async function updateEmailLogStatus(
  logId: string,
  status: 'SENT' | 'FAILED',
  errorMessage?: string | null
): Promise<void> {
  const now = new Date().toISOString();
  const sb = getSupabase();
  if (sb) {
    try {
      const { data: existing } = await sb
        .from('email_logs')
        .select('retry_count')
        .eq('id', logId)
        .maybeSingle();

      const payload: any = {
        status,
        error_message: errorMessage || null,
        last_attempted_at: now,
      };
      if (status === 'SENT') {
        payload.sent_at = now;
      } else {
        payload.retry_count = ((existing?.retry_count) || 0) + 1;
      }

      await sb.from('email_logs').update(payload).eq('id', logId);
      return;
    } catch (e) {
      console.warn('[DB:Supabase] updateEmailLogStatus error, fallback:', e);
    }
  }

  const store = readStore();
  const log = (store.emailLogs || []).find((l: any) => l.id === logId);
  if (!log) return;

  log.status = status;
  log.errorMessage = errorMessage || null;
  log.lastAttemptedAt = now;
  if (status === 'SENT') {
    log.sentAt = now;
  } else {
    log.retryCount = (log.retryCount || 0) + 1;
  }

  writeStore(store);
}

// ── AUDIT LOGS ──────────────────────────────────────────────────────

export function logAudit(
  actorType: 'ADMIN' | 'HR' | 'SYSTEM',
  actorName: string,
  action: string,
  details?: any
): void {
  const now = new Date().toISOString();
  const sb = getSupabase();
  if (sb) {
    sb.from('audit_logs')
      .insert({
        actor_type: actorType,
        actor_name: actorName,
        action,
        details: details || {},
        created_at: now,
      })
      .then(
        () => {},
        (e: any) => console.warn('[AUDIT:Supabase] write failure:', e)
      );
    return;
  }

  try {
    const store = readStore();
    store.auditLogs = store.auditLogs || [];
    store.auditLogs.push({
      id: crypto.randomUUID(),
      actorType,
      actorName,
      action,
      details: details || {},
      createdAt: now,
    });
    writeStore(store);
  } catch (e) {
    console.error('[AUDIT] Failed to write audit log:', e);
  }
}

export async function listAuditLogs(): Promise<any[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (!error && data) {
        return data.map((a: any) => ({
          id: a.id,
          actorType: a.actor_type,
          actorRole: a.actor_type,
          actorName: a.actor_name,
          action: a.action,
          details: a.details,
          createdAt: a.created_at,
          timestamp: a.created_at,
        }));
      }
    } catch (e) {
      console.warn('[DB:Supabase] listAuditLogs fallback:', e);
    }
  }

  const store = readStore();
  return (store.auditLogs || [])
    .map((l: any) => ({
      ...l,
      actorRole: l.actorRole || l.actorType,
      timestamp: l.timestamp || l.createdAt,
    }))
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAt || b.timestamp).getTime() -
        new Date(a.createdAt || a.timestamp).getTime()
    );
}

// ── REAL-TIME DASHBOARD STATS ───────────────────────────────────────

export async function getDashboardStats(): Promise<any> {
  const cached = getCached<any>('stats:dashboard', 20000);
  if (cached) return cached;

  const sb = getSupabase();
  if (sb) {
    try {
      const [
        { data: apps },
        { data: appTeams },
        { data: schedules },
        { data: evals },
        { data: reviews },
        { data: decisions },
        { data: emails },
        { data: hrs },
      ] = await Promise.all([
        sb.from('applicants').select('id'),
        sb.from('applicant_teams').select('applicant_id, team_id'),
        sb.from('interview_schedules').select('applicant_id, status'),
        sb.from('evaluations').select('applicant_id, status'),
        sb.from('applicant_reviews').select('is_reviewed'),
        sb.from('team_decisions').select('decision'),
        sb.from('email_logs').select('status'),
        sb.from('hr_accounts').select('id'),
      ]);

      const totalApplicants = (apps || []).length;
      const totalTeamApplications = (appTeams || []).length;
      let techTeamApplications = 0;
      let nonTechTeamApplications = 0;
      const teamCounts: Record<string, number> = {};

      for (const t of TEAMS) {
        teamCounts[t.id] = 0;
      }

      for (const at of appTeams || []) {
        const t = findTeam(at.team_id);
        if (t) {
          teamCounts[t.id] = (teamCounts[t.id] || 0) + 1;
        }
        if (t?.broadCategory === 'TECH') techTeamApplications++;
        else if (t?.broadCategory === 'NON_TECH') nonTechTeamApplications++;
      }

      let techOnlyCount = 0;
      let nonTechOnlyCount = 0;
      let bothCount = 0;

      for (const app of apps || []) {
        const teamLinks = (appTeams || []).filter((at: any) => at.applicant_id === app.id);
        const hasTech = teamLinks.some((tl: any) => {
          const t = findTeam(tl.team_id);
          return t?.broadCategory === 'TECH';
        });
        const hasNonTech = teamLinks.some((tl: any) => {
          const t = findTeam(tl.team_id);
          return t?.broadCategory === 'NON_TECH';
        });

        if (hasTech && hasNonTech) bothCount++;
        else if (hasTech) techOnlyCount++;
        else if (hasNonTech) nonTechOnlyCount++;
      }

      const evaluatedCompletedAppIds = new Set<string>();
      const evaluatedSemiCompletedAppIds = new Set<string>();

      for (const ev of evals || []) {
        if (ev.status === 'SEMI_COMPLETED') {
          evaluatedSemiCompletedAppIds.add(ev.applicant_id);
        } else {
          evaluatedCompletedAppIds.add(ev.applicant_id);
        }
      }

      for (const s of schedules || []) {
        if (s.status === 'COMPLETED') {
          evaluatedCompletedAppIds.add(s.applicant_id);
          evaluatedSemiCompletedAppIds.delete(s.applicant_id);
        } else if (s.status === 'SEMI_COMPLETED') {
          if (!evaluatedCompletedAppIds.has(s.applicant_id)) {
            evaluatedSemiCompletedAppIds.add(s.applicant_id);
          }
        }
      }

      const completedInterviews = evaluatedCompletedAppIds.size;
      const semiCompletedInterviews = evaluatedSemiCompletedAppIds.size;
      const pendingInterviews = (schedules || []).filter((s: any) => s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS').length;

      const allInterviewAppIds = new Set<string>([
        ...(schedules || []).map((s: any) => s.applicant_id),
        ...evaluatedCompletedAppIds,
        ...evaluatedSemiCompletedAppIds,
      ]);
      const scheduledInterviews = allInterviewAppIds.size;

      const reviewedApplicants = (reviews || []).filter((r: any) => r.is_reviewed).length;
      const unreviewedApplicants = Math.max(0, totalApplicants - reviewedApplicants);

      const acceptedDecisions = (decisions || []).filter((d: any) => d.decision === 'ACCEPTED').length;
      const rejectedDecisions = (decisions || []).filter((d: any) => d.decision === 'REJECTED').length;

      const failedEmails = (emails || []).filter((e: any) => e.status === 'FAILED').length;
      const sentEmails = (emails || []).filter((e: any) => e.status === 'SENT').length;

      const statsResult = {
        totalApplicants,
        totalTeamApplications,
        techTeamApplications,
        nonTechTeamApplications,
        teamCounts,
        techOnlyCount,
        nonTechOnlyCount,
        bothCount,
        scheduledInterviews,
        completedInterviews,
        semiCompletedInterviews,
        pendingInterviews,
        reviewedApplicants,
        unreviewedApplicants,
        acceptedDecisions,
        rejectedDecisions,
        failedEmails,
        sentEmails,
        totalHRAccounts: (hrs || []).length,
      };
      setCached('stats:dashboard', statsResult);
      return statsResult;
    } catch (e) {
      console.warn('[DB:Supabase] getDashboardStats error, fallback:', e);
    }
  }

  const store = readStore();
  const totalApplicants = (store.applicants || []).length;
  const totalTeamApplications = (store.applicantTeams || []).length;
  let techTeamApplications = 0;
  let nonTechTeamApplications = 0;
  const teamCounts: Record<string, number> = {};

  for (const t of TEAMS) {
    teamCounts[t.id] = 0;
  }

  for (const at of store.applicantTeams || []) {
    const t = findTeam(at.teamId);
    if (t) {
      teamCounts[t.id] = (teamCounts[t.id] || 0) + 1;
    }
    if (t?.broadCategory === 'TECH') techTeamApplications++;
    else if (t?.broadCategory === 'NON_TECH') nonTechTeamApplications++;
  }

  let techOnlyCount = 0;
  let nonTechOnlyCount = 0;
  let bothCount = 0;

  for (const app of store.applicants || []) {
    const teamLinks = (store.applicantTeams || []).filter((at: any) => at.applicantId === app.id);
    const hasTech = teamLinks.some((tl: any) => {
      const t = findTeam(tl.teamId);
      return t?.broadCategory === 'TECH';
    });
    const hasNonTech = teamLinks.some((tl: any) => {
      const t = findTeam(tl.teamId);
      return t?.broadCategory === 'NON_TECH';
    });

    if (hasTech && hasNonTech) bothCount++;
    else if (hasTech) techOnlyCount++;
    else if (hasNonTech) nonTechOnlyCount++;
  }

  const evaluatedCompletedAppIds = new Set<string>();
  const evaluatedSemiCompletedAppIds = new Set<string>();

  for (const ev of store.evaluations || []) {
    if (ev.status === 'SEMI_COMPLETED') {
      evaluatedSemiCompletedAppIds.add(ev.applicantId);
    } else {
      evaluatedCompletedAppIds.add(ev.applicantId);
    }
  }

  for (const s of store.interviewSchedules || []) {
    if (s.status === 'COMPLETED') {
      evaluatedCompletedAppIds.add(s.applicantId);
      evaluatedSemiCompletedAppIds.delete(s.applicantId);
    } else if (s.status === 'SEMI_COMPLETED') {
      if (!evaluatedCompletedAppIds.has(s.applicantId)) {
        evaluatedSemiCompletedAppIds.add(s.applicantId);
      }
    }
  }

  const completedInterviews = evaluatedCompletedAppIds.size;
  const semiCompletedInterviews = evaluatedSemiCompletedAppIds.size;
  const pendingInterviews = (store.interviewSchedules || []).filter((s: any) => s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS').length;
  const allInterviewAppIds = new Set<string>([
    ...(store.interviewSchedules || []).map((s: any) => s.applicantId),
    ...evaluatedCompletedAppIds,
    ...evaluatedSemiCompletedAppIds,
  ]);
  const scheduledInterviews = allInterviewAppIds.size;

  const reviewedApplicants = (store.applicantReviews || []).filter((r: any) => r.isReviewed).length;
  const unreviewedApplicants = Math.max(0, totalApplicants - reviewedApplicants);

  const acceptedDecisions = (store.teamDecisions || []).filter((d: any) => d.decision === 'ACCEPTED').length;
  const rejectedDecisions = (store.teamDecisions || []).filter((d: any) => d.decision === 'REJECTED').length;

  const failedEmails = (store.emailLogs || []).filter((l: any) => l.status === 'FAILED').length;
  const sentEmails = (store.emailLogs || []).filter((l: any) => l.status === 'SENT').length;

  return {
    totalApplicants,
    totalTeamApplications,
    techTeamApplications,
    nonTechTeamApplications,
    teamCounts,
    techOnlyCount,
    nonTechOnlyCount,
    bothCount,
    scheduledInterviews,
    completedInterviews,
    semiCompletedInterviews,
    pendingInterviews,
    reviewedApplicants,
    unreviewedApplicants,
    acceptedDecisions,
    rejectedDecisions,
    failedEmails,
    sentEmails,
    totalHRAccounts: (store.hrAccounts || []).length,
  };
}
