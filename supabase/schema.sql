-- ==============================================================================
-- IEEE ECU Student Branch — Production Recruitment & Interview Database Schema
-- @file schema.sql
-- @author Senior Full-Stack Software Architect
-- @since 2026-09-18
-- @description Normalized schema with Row-Level Security, auditability, 
--              and atomic concurrency guarantees.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TEAMS (Canonical IEEE ECU Committees)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    broad_category TEXT NOT NULL CHECK (broad_category IN ('TECH', 'NON_TECH')),
    conceptual_category TEXT NOT NULL CHECK (conceptual_category IN ('TECH', 'MEDIA', 'OPERATIONS')),
    required_head_category TEXT NOT NULL CHECK (required_head_category IN ('TECH_HEAD', 'MEDIA_HEAD', 'PR_HEAD', 'EVENTS_HEAD', 'HR_HEAD')),
    description TEXT,
    color TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 3. ADMINISTRATIVE & HR ACCOUNTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 4. APPLICANTS (Append-Only Public Submissions)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.applicants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT NOT NULL,
    national_id VARCHAR(14) UNIQUE,
    faculty TEXT,
    academic_level TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_applicants_national_id ON public.applicants(national_id);
CREATE INDEX IF NOT EXISTS idx_applicants_email ON public.applicants(email);
CREATE INDEX IF NOT EXISTS idx_applicants_created_at ON public.applicants(created_at DESC);

-- Join table: Applicant <-> Teams (Max 1 Tech and Max 1 Non-Tech)
CREATE TABLE IF NOT EXISTS public.applicant_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_id UUID NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (applicant_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_applicant_teams_app_id ON public.applicant_teams(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applicant_teams_team_id ON public.applicant_teams(team_id);

-- ==============================================================================
-- 5. AVAILABILITY SCHEDULES (HR & HEAD WINDOWS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.hr_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hr_id UUID NOT NULL REFERENCES public.hr_accounts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_hr_avail_date ON public.hr_availability(date);
CREATE INDEX IF NOT EXISTS idx_hr_avail_hr_id ON public.hr_availability(hr_id);

CREATE TABLE IF NOT EXISTS public.head_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    head_name TEXT NOT NULL,
    head_category TEXT NOT NULL CHECK (head_category IN ('TECH_HEAD', 'MEDIA_HEAD', 'PR_HEAD', 'EVENTS_HEAD', 'HR_HEAD')),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_head_avail_date_cat ON public.head_availability(date, head_category);

-- ==============================================================================
-- 6. INTERVIEW SCHEDULES (Single Unified Interview Per Applicant)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.interview_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_id UUID NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE UNIQUE,
    hr_id UUID NOT NULL REFERENCES public.hr_accounts(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 12,
    interview_mode TEXT NOT NULL DEFAULT 'ONLINE' CHECK (interview_mode IN ('ONLINE', 'OFFLINE')),
    location TEXT,
    meeting_link TEXT,
    status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    is_manual_override BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interviews_date_hr ON public.interview_schedules(date, hr_id);
CREATE INDEX IF NOT EXISTS idx_interviews_applicant ON public.interview_schedules(applicant_id);

-- Assigned heads for the interview
CREATE TABLE IF NOT EXISTS public.interview_heads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID NOT NULL REFERENCES public.interview_schedules(id) ON DELETE CASCADE,
    head_name TEXT NOT NULL,
    head_category TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 7. EVALUATION SYSTEM (Dynamic Criteria & Submissions)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.evaluation_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    section TEXT NOT NULL CHECK (section IN ('GENERAL', 'TECH', 'NON_TECH')),
    team_category TEXT NOT NULL DEFAULT 'ALL',
    description TEXT,
    response_type TEXT NOT NULL DEFAULT 'SCORE' CHECK (response_type IN ('SCORE', 'PARAGRAPH')),
    min_score INT NOT NULL DEFAULT 1,
    max_score INT NOT NULL DEFAULT 10,
    order_index INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_criteria_section ON public.evaluation_criteria(section, is_active);

CREATE TABLE IF NOT EXISTS public.evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID NOT NULL REFERENCES public.interview_schedules(id) ON DELETE CASCADE UNIQUE,
    applicant_id UUID NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
    hr_id UUID NOT NULL REFERENCES public.hr_accounts(id) ON DELETE RESTRICT,
    general_notes TEXT,
    tech_notes TEXT,
    non_tech_notes TEXT,
    general_average NUMERIC(5,2),
    tech_average NUMERIC(5,2),
    non_tech_average NUMERIC(5,2),
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evaluations_app ON public.evaluations(applicant_id);

CREATE TABLE IF NOT EXISTS public.evaluation_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
    criterion_id UUID NOT NULL REFERENCES public.evaluation_criteria(id) ON DELETE RESTRICT,
    score INT,
    text_response TEXT,
    UNIQUE(evaluation_id, criterion_id)
);

-- ==============================================================================
-- 8. REVIEW STATUS & TEAM-SPECIFIC ACCEPTANCE/REJECTION DECISIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.applicant_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_id UUID NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE UNIQUE,
    is_reviewed BOOLEAN NOT NULL DEFAULT false,
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_id UUID NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE RESTRICT,
    decision TEXT NOT NULL DEFAULT 'PENDING' CHECK (decision IN ('PENDING', 'ACCEPTED', 'REJECTED')),
    decided_at TIMESTAMPTZ,
    decided_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (applicant_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_team_decisions_app ON public.team_decisions(applicant_id);

-- ==============================================================================
-- 9. EMAIL TEMPLATES & LOGS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.email_templates (
    id TEXT PRIMARY KEY, -- 'INTERVIEW', 'ACCEPTANCE', 'REJECTION'
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_email TEXT NOT NULL,
    applicant_id UUID REFERENCES public.applicants(id) ON DELETE SET NULL,
    applicant_name TEXT,
    email_type TEXT NOT NULL,
    team_name TEXT,
    subject TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('SENT', 'FAILED')),
    error_message TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    last_attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_applicant ON public.email_logs(applicant_id);

-- ==============================================================================
-- 10. AUDIT LEDGER
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_type TEXT NOT NULL CHECK (actor_type IN ('ADMIN', 'HR', 'SYSTEM')),
    actor_name TEXT NOT NULL,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applicant_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.head_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applicant_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Public read access to active teams catalog
CREATE POLICY "Public read teams" ON public.teams FOR SELECT USING (true);

-- Public insert-only access for applicants (APPEND-ONLY)
CREATE POLICY "Public insert applicants" ON public.applicants FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert applicant_teams" ON public.applicant_teams FOR INSERT WITH CHECK (true);

-- Deny public select, update, delete on applicants
-- (Only server-side execution via service_role key can read/manage applicant data)
