-- ==============================================================================
-- IEEE ECU SB Platform - Full Database Drop & Complete Rebuild (One Atomic Query)
-- Project: <YOUR_SUPABASE_PROJECT_REF>
-- ==============================================================================

-- 1. DROP ALL EXISTING OBJECTS (CASCADE)
DROP FUNCTION IF EXISTS public.submit_application(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[]) CASCADE;
DROP FUNCTION IF EXISTS public.submit_application(TEXT, TEXT, TEXT, VARCHAR, TEXT, TEXT, TEXT[]) CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.email_logs CASCADE;
DROP TABLE IF EXISTS public.email_templates CASCADE;
DROP TABLE IF EXISTS public.team_decisions CASCADE;
DROP TABLE IF EXISTS public.applicant_reviews CASCADE;
DROP TABLE IF EXISTS public.evaluation_scores CASCADE;
DROP TABLE IF EXISTS public.evaluations CASCADE;
DROP TABLE IF EXISTS public.evaluation_criteria CASCADE;
DROP TABLE IF EXISTS public.interview_heads CASCADE;
DROP TABLE IF EXISTS public.interview_schedules CASCADE;
DROP TABLE IF EXISTS public.head_availability CASCADE;
DROP TABLE IF EXISTS public.hr_availability CASCADE;
DROP TABLE IF EXISTS public.applicant_teams CASCADE;
DROP TABLE IF EXISTS public.applicants CASCADE;
DROP TABLE IF EXISTS public.hr_accounts CASCADE;
DROP TABLE IF EXISTS public.admins CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;

-- 2. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 3. SCHEMA DEFINITION (17 CANONICAL TABLES)
-- ==============================================================================

-- TEAMS
CREATE TABLE public.teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    broad_category TEXT NOT NULL CHECK (broad_category IN ('TECH', 'NON_TECH')),
    conceptual_category TEXT NOT NULL CHECK (conceptual_category IN ('TECH', 'MEDIA', 'OPERATIONS')),
    required_head_category TEXT NOT NULL CHECK (required_head_category IN ('TECH_HEAD', 'MEDIA_HEAD', 'PR_HEAD', 'EVENTS_HEAD', 'HR_HEAD')),
    description TEXT,
    color TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ADMINS
CREATE TABLE public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HR ACCOUNTS
CREATE TABLE public.hr_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- APPLICANTS
CREATE TABLE public.applicants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT NOT NULL,
    national_id VARCHAR(14) NOT NULL UNIQUE,
    faculty TEXT,
    academic_level TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_applicants_national_id ON public.applicants(national_id);
CREATE INDEX idx_applicants_email ON public.applicants(email);
CREATE INDEX idx_applicants_created_at ON public.applicants(created_at DESC);

-- APPLICANT TEAMS
CREATE TABLE public.applicant_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_id UUID NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (applicant_id, team_id)
);

CREATE INDEX idx_applicant_teams_app_id ON public.applicant_teams(applicant_id);
CREATE INDEX idx_applicant_teams_team_id ON public.applicant_teams(team_id);

-- HR AVAILABILITY
CREATE TABLE public.hr_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hr_id UUID NOT NULL REFERENCES public.hr_accounts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_time > start_time)
);

CREATE INDEX idx_hr_avail_date ON public.hr_availability(date);
CREATE INDEX idx_hr_avail_hr_id ON public.hr_availability(hr_id);

-- HEAD AVAILABILITY
CREATE TABLE public.head_availability (
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

CREATE INDEX idx_head_avail_date_cat ON public.head_availability(date, head_category);

-- INTERVIEW SCHEDULES (Single Unified Interview Per Applicant, Online / Offline support)
CREATE TABLE public.interview_schedules (
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

CREATE INDEX idx_interviews_date_hr ON public.interview_schedules(date, hr_id);
CREATE INDEX idx_interviews_applicant ON public.interview_schedules(applicant_id);

-- INTERVIEW HEADS
CREATE TABLE public.interview_heads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID NOT NULL REFERENCES public.interview_schedules(id) ON DELETE CASCADE,
    head_name TEXT NOT NULL,
    head_category TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- EVALUATION CRITERIA
CREATE TABLE public.evaluation_criteria (
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

CREATE INDEX idx_criteria_section ON public.evaluation_criteria(section, is_active);

-- EVALUATIONS
CREATE TABLE public.evaluations (
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

CREATE INDEX idx_evaluations_app ON public.evaluations(applicant_id);

-- EVALUATION SCORES
CREATE TABLE public.evaluation_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
    criterion_id UUID NOT NULL REFERENCES public.evaluation_criteria(id) ON DELETE RESTRICT,
    score INT,
    text_response TEXT,
    UNIQUE(evaluation_id, criterion_id)
);

-- APPLICANT REVIEWS
CREATE TABLE public.applicant_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_id UUID NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE UNIQUE,
    is_reviewed BOOLEAN NOT NULL DEFAULT false,
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- TEAM DECISIONS
CREATE TABLE public.team_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_id UUID NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE RESTRICT,
    decision TEXT NOT NULL DEFAULT 'PENDING' CHECK (decision IN ('PENDING', 'ACCEPTED', 'REJECTED')),
    decided_at TIMESTAMPTZ,
    decided_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (applicant_id, team_id)
);

CREATE INDEX idx_team_decisions_app ON public.team_decisions(applicant_id);

-- EMAIL TEMPLATES
CREATE TABLE public.email_templates (
    id TEXT PRIMARY KEY,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- EMAIL LOGS
CREATE TABLE public.email_logs (
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

CREATE INDEX idx_email_logs_status ON public.email_logs(status);
CREATE INDEX idx_email_logs_applicant ON public.email_logs(applicant_id);

-- AUDIT LOGS
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_type TEXT NOT NULL CHECK (actor_type IN ('ADMIN', 'HR', 'SYSTEM')),
    actor_name TEXT NOT NULL,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) & PERMISSIONS
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

-- Allow public read access to active teams
CREATE POLICY "Public read teams" ON public.teams FOR SELECT USING (true);

-- Allow public read access to email templates (for preview/rendering)
CREATE POLICY "Public read email_templates" ON public.email_templates FOR SELECT USING (true);

-- Allow public read access to evaluation criteria
CREATE POLICY "Public read evaluation_criteria" ON public.evaluation_criteria FOR SELECT USING (true);

-- Allow anon & authenticated insert on applicants and applicant_teams (form submission)
CREATE POLICY "Allow insert applicants" ON public.applicants FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert applicant_teams" ON public.applicant_teams FOR INSERT WITH CHECK (true);

-- Allow anon read on system_settings (recruitment open/closed status check)
CREATE POLICY "Anon read system_settings" ON public.system_settings FOR SELECT TO anon, authenticated USING (true);

-- ── PRODUCTION: service_role-only full access on all tables ──
-- The admin backend uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS.
-- No anon/authenticated role can read or modify sensitive data.
CREATE POLICY "Service role full access on admins" ON public.admins FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on hr_accounts" ON public.hr_accounts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on applicants" ON public.applicants FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on applicant_teams" ON public.applicant_teams FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on hr_availability" ON public.hr_availability FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on head_availability" ON public.head_availability FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on interview_schedules" ON public.interview_schedules FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on interview_heads" ON public.interview_heads FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on evaluation_criteria" ON public.evaluation_criteria FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on evaluations" ON public.evaluations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on evaluation_scores" ON public.evaluation_scores FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on applicant_reviews" ON public.applicant_reviews FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on team_decisions" ON public.team_decisions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on email_templates" ON public.email_templates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on email_logs" ON public.email_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on audit_logs" ON public.audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on system_settings" ON public.system_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ==============================================================================
-- 5. ATOMIC RPC FUNCTION FOR APPLICANT SUBMISSION (SECURITY DEFINER)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.submit_application(
    p_full_name TEXT,
    p_phone_number TEXT,
    p_email TEXT,
    p_national_id TEXT,
    p_faculty TEXT DEFAULT NULL,
    p_academic_level TEXT DEFAULT NULL,
    p_team_ids TEXT[] DEFAULT '{}'::TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_applicant_id UUID;
    v_created_at TIMESTAMPTZ;
    v_team_id TEXT;
BEGIN
    -- Check for duplicate national ID
    IF EXISTS (SELECT 1 FROM public.applicants WHERE national_id = p_national_id) THEN
        RAISE EXCEPTION 'An application with this National ID has already been submitted.';
    END IF;

    -- Validate team count
    IF array_length(p_team_ids, 1) IS NULL OR array_length(p_team_ids, 1) = 0 THEN
        RAISE EXCEPTION 'At least one team must be selected.';
    END IF;

    -- Insert applicant
    INSERT INTO public.applicants (
        full_name,
        phone_number,
        email,
        national_id,
        faculty,
        academic_level
    ) VALUES (
        p_full_name,
        p_phone_number,
        LOWER(TRIM(p_email)),
        p_national_id,
        p_faculty,
        p_academic_level
    )
    RETURNING id, created_at INTO v_applicant_id, v_created_at;

    -- Insert applicant teams
    FOREACH v_team_id IN ARRAY p_team_ids
    LOOP
        INSERT INTO public.applicant_teams (applicant_id, team_id)
        VALUES (v_applicant_id, v_team_id);
    END LOOP;

    RETURN jsonb_build_object(
        'id', v_applicant_id,
        'created_at', v_created_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_application(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[]) TO anon, authenticated, service_role, public;

-- ==============================================================================
-- 6. SEED DATA
-- ==============================================================================

-- 6.1 Canonical Teams
INSERT INTO public.teams (id, name, broad_category, conceptual_category, required_head_category, description, color) VALUES
('general-tech', 'General', 'TECH', 'TECH', 'TECH_HEAD', 'Core engineering, embedded systems, and prototype innovation', '#023260'),
('software', 'Software', 'TECH', 'TECH', 'TECH_HEAD', 'Full-stack engineering, algorithms, competitive programming, and web platforms', '#00a1c0'),
('hardware', 'Hardware', 'TECH', 'TECH', 'TECH_HEAD', 'PCB layout, microcontrollers, robotics, and circuit architecture', '#1e40af'),
('pr-logistics', 'PR & Logistics', 'NON_TECH', 'OPERATIONS', 'PR_HEAD', 'Partnership negotiations, logistics procurement, and event operations', '#b45309'),
('events', 'Events', 'NON_TECH', 'OPERATIONS', 'EVENTS_HEAD', 'Event concept execution, crowd engagement, and stage management', '#be123c'),
('hr', 'HR', 'NON_TECH', 'OPERATIONS', 'HR_HEAD', 'Member evaluations, branch culture, performance appraisals, and bonding', '#4338ca'),
('visuals', 'Visuals', 'NON_TECH', 'MEDIA', 'MEDIA_HEAD', 'Cinematic video production, storytelling, and motion editing', '#0f766e'),
('graphics', 'Graphics', 'NON_TECH', 'MEDIA', 'MEDIA_HEAD', 'Brand visual design, typography, posters, and digital asset creation', '#7c3aed'),
('marketing', 'Marketing', 'NON_TECH', 'MEDIA', 'MEDIA_HEAD', 'Campaign marketing, social media growth, and content copy', '#c2410c');

-- 6.2 Administrator Account (Initial administrative seed credential)
-- Replace the bcrypt hash below with your custom administrator password hash
INSERT INTO public.admins (id, username, name, password_hash)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'admin',
    'Executive Administrator',
    '$2a$10$I6osfi6fsAPwFh4aYfZ2GOt/CPd61r8kZC80ypdHyeidhkX12aEG2'
);

-- 6.3 HR Accounts (Initial seed accounts)
-- Replace the bcrypt hash below with your custom HR password hash
INSERT INTO public.hr_accounts (id, name, password_hash)
VALUES 
    ('b0000000-0000-0000-0000-000000000001', 'Sarah HR', '$2a$10$5naYWWpnJ9eQdNvK9MRFX.r0W4UG.4NtMf/iW5F1Hvor3rvSCa20G'),
    ('b0000000-0000-0000-0000-000000000002', 'Omar HR', '$2a$10$5naYWWpnJ9eQdNvK9MRFX.r0W4UG.4NtMf/iW5F1Hvor3rvSCa20G');

-- 6.4 Initial HR Availability Windows
INSERT INTO public.hr_availability (id, hr_id, date, start_time, end_time, is_available)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2026-09-25', '09:00:00', '15:00:00', true),
    ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', '2026-09-25', '09:00:00', '15:00:00', true);

-- 6.5 Initial Committee Head Availability Windows
INSERT INTO public.head_availability (id, head_name, head_category, date, start_time, end_time, is_available)
VALUES
    ('d0000000-0000-0000-0000-000000000001', 'Kareem (Software Head)', 'TECH_HEAD', '2026-09-25', '09:00:00', '15:00:00', true),
    ('d0000000-0000-0000-0000-000000000002', 'Nour (Media Head)', 'MEDIA_HEAD', '2026-09-25', '09:00:00', '15:00:00', true),
    ('d0000000-0000-0000-0000-000000000003', 'Youssef (PR Head)', 'PR_HEAD', '2026-09-25', '09:00:00', '15:00:00', true),
    ('d0000000-0000-0000-0000-000000000004', 'Salma (Events Head)', 'EVENTS_HEAD', '2026-09-25', '09:00:00', '15:00:00', true),
    ('d0000000-0000-0000-0000-000000000005', 'Hana (HR Head)', 'HR_HEAD', '2026-09-25', '09:00:00', '15:00:00', true);

-- 6.6 Dynamic Evaluation Criteria
INSERT INTO public.evaluation_criteria (name, section, team_category, description, min_score, max_score, order_index, is_active) VALUES
-- General Criteria
('Communication & Articulation', 'GENERAL', 'ALL', 'Clarity of thought, active listening, and concise verbal expression', 1, 10, 1, true),
('Commitment & Availability', 'GENERAL', 'ALL', 'Dedication to season deadlines, university workload balance, and attendance', 1, 10, 2, true),
('Teamwork & Culture Fit', 'GENERAL', 'ALL', 'Collaborative attitude, peer respect, ego management, and enthusiasm', 1, 10, 3, true),
('Critical Thinking & Adaptability', 'GENERAL', 'ALL', 'Ability to think on their feet when faced with unexpected constraints', 1, 10, 4, true),

-- Tech Criteria
('Fundamental Technical Knowledge', 'TECH', 'ALL', 'Core concepts relevant to the applicant technological domain', 1, 10, 10, true),
('Problem Solving & Analytical Approach', 'TECH', 'ALL', 'Structured problem deconstruction and algorithmic thought process', 1, 10, 11, true),
('Software Architecture & Clean Code', 'TECH', 'software', 'Understanding of modular code, version control (git), and frameworks', 1, 10, 12, true),
('Hardware & Circuit Fundamentals', 'TECH', 'hardware', 'Schematic reading, component selection, soldering, and embedded testing', 1, 10, 13, true),
('Prototype Innovation & Research', 'TECH', 'general-tech', 'Curiosity, multidisciplinary engineering, and rapid prototyping', 1, 10, 14, true),

-- Non-Tech / Operations & Media Criteria
('Public Relations & Negotiation', 'NON_TECH', 'pr-logistics', 'Persuasiveness, professional etiquette, and sponsorship pitch confidence', 1, 10, 20, true),
('Event Coordination & Crisis Management', 'NON_TECH', 'events', 'Time management, operational agility, and stress resilience under live events', 1, 10, 21, true),
('Interpersonal Empathy & Conflict Handling', 'NON_TECH', 'hr', 'Emotional intelligence, unbiased judgment, and active member support', 1, 10, 22, true),
('Visual Storytelling & Video Editing', 'NON_TECH', 'visuals', 'Pacing, framing, cinematic rhythm, and editing software proficiency', 1, 10, 23, true),
('Graphic Design & Aesthetic Sensitivity', 'NON_TECH', 'graphics', 'Color theory, composition, hierarchy, and creative design tool fluency', 1, 10, 24, true),
('Marketing Campaign & Content Writing', 'NON_TECH', 'marketing', 'Audience targeting, creative copy, tone of voice, and trend awareness', 1, 10, 25, true);

-- 6.7 Email Templates (with interview_mode, location, meeting_link support)
INSERT INTO public.email_templates (id, subject, body_html) VALUES
('INTERVIEW', 
'Interview Invitation — IEEE ECU Student Branch | {{team}}',
'<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Interview Invitation | IEEE ECU SB</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:''Segoe UI'',Arial,sans-serif;color:#f8fafc;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0f172a;padding:40px 15px;">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#023260;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);box-shadow:0 20px 40px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding:36px 30px;background:linear-gradient(135deg, #023260 0%, #011c38 100%);text-align:center;border-bottom:2px solid #D92525;">
              <h1 style="margin:0;font-size:24px;font-weight:800;letter-spacing:1px;color:#ffffff;text-transform:uppercase;">
                IEEE ECU Student Branch
              </h1>
              <p style="margin:6px 0 0 0;font-size:13px;color:#00a1c0;letter-spacing:0.5px;font-weight:600;">
                Recruitment Season 2026-2027
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px;background-color:#023260;">
              <h2 style="margin:0 0 16px 0;font-size:20px;color:#ffffff;font-weight:700;">
                Hello {{name}},
              </h2>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#cbd5e1;">
                Thank you for applying to join the <strong style="color:#ffffff;">IEEE ECU Student Branch</strong> family!
              </p>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#cbd5e1;">
                We are delighted to invite you for your official recruitment interview for:
              </p>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:rgba(0,161,192,0.12);border-left:4px solid #00a1c0;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 8px 0;font-size:14px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">
                      Applied Committee(s)
                    </p>
                    <p style="margin:0;font-size:17px;font-weight:700;color:#ffffff;">
                      {{team}}
                    </p>
                    <p style="margin:12px 0 0 0;font-size:14px;color:#38bdf8;">
                      <strong>Date & Time:</strong> {{date}} at {{time}}<br>
                      <strong>Format:</strong> {{interview_mode}}<br>
                      {{location}}
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#cbd5e1;">
                <strong>Important Interview Details:</strong><br>
                • As per our branch recruitment policy, you receive <strong>ONE unified interview</strong> covering all applied areas.<br>
                • Please be present 10 minutes prior to your scheduled slot.<br>
                • Bring your passion, curiosity, and any relevant portfolio or project work.
              </p>
              <p style="margin:24px 0 0 0;font-size:15px;line-height:1.6;color:#cbd5e1;">
                We look forward to meeting you and discussing your journey ahead!
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 30px;background-color:#011c38;text-align:center;border-top:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0 0 6px 0;font-size:13px;color:#94a3b8;">
                IEEE ECU Student Branch • Egyptian Chinese University
              </p>
              <p style="margin:0;font-size:12px;color:#64748b;">
                Inspiring Innovation, Empowering Engineers.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>'
),
('ACCEPTANCE',
'Congratulations! Welcome to IEEE ECU Student Branch | {{team}}',
'<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to IEEE ECU SB</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:''Segoe UI'',Arial,sans-serif;color:#f8fafc;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0f172a;padding:40px 15px;">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#023260;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);box-shadow:0 20px 40px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding:36px 30px;background:linear-gradient(135deg, #023260 0%, #011c38 100%);text-align:center;border-bottom:2px solid #10b981;">
              <h1 style="margin:0;font-size:24px;font-weight:800;letter-spacing:1px;color:#ffffff;text-transform:uppercase;">
                IEEE ECU Student Branch
              </h1>
              <p style="margin:6px 0 0 0;font-size:13px;color:#10b981;letter-spacing:0.5px;font-weight:700;">
                ★ Official Offer of Acceptance ★
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px;background-color:#023260;">
              <h2 style="margin:0 0 16px 0;font-size:22px;color:#ffffff;font-weight:700;">
                Congratulations, {{name}}! 🎉
              </h2>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#cbd5e1;">
                On behalf of the High Board and Executive Council, we are thrilled to officially welcome you to the <strong style="color:#ffffff;">IEEE ECU Student Branch</strong>!
              </p>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:rgba(16,185,129,0.12);border-left:4px solid #10b981;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 8px 0;font-size:14px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">
                      Accepted Committee
                    </p>
                    <p style="margin:0;font-size:18px;font-weight:800;color:#10b981;">
                      {{team}}
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#cbd5e1;">
                Your performance, dedication, and problem-solving spirit during the evaluation process truly stood out among many candidates.
              </p>
              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#cbd5e1;">
                Our onboarding session and first branch general meeting will take place shortly. Keep an eye on your phone and email for upcoming schedules and communications.
              </p>
              <p style="margin:24px 0 0 0;font-size:15px;line-height:1.6;color:#ffffff;font-weight:600;">
                Welcome aboard to an extraordinary journey of growth and leadership!
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 30px;background-color:#011c38;text-align:center;border-top:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0 0 6px 0;font-size:13px;color:#94a3b8;">
                IEEE ECU Student Branch • Egyptian Chinese University
              </p>
              <p style="margin:0;font-size:12px;color:#64748b;">
                Inspiring Innovation, Empowering Engineers.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>'
),
('REJECTION',
'Update Regarding Your IEEE ECU Student Branch Application | {{team}}',
'<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Status | IEEE ECU SB</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:''Segoe UI'',Arial,sans-serif;color:#f8fafc;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0f172a;padding:40px 15px;">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#023260;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);box-shadow:0 20px 40px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding:36px 30px;background:linear-gradient(135deg, #023260 0%, #011c38 100%);text-align:center;border-bottom:2px solid #64748b;">
              <h1 style="margin:0;font-size:24px;font-weight:800;letter-spacing:1px;color:#ffffff;text-transform:uppercase;">
                IEEE ECU Student Branch
              </h1>
              <p style="margin:6px 0 0 0;font-size:13px;color:#94a3b8;letter-spacing:0.5px;font-weight:600;">
                Application Status Update
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px;background-color:#023260;">
              <h2 style="margin:0 0 16px 0;font-size:20px;color:#ffffff;font-weight:700;">
                Dear {{name}},
              </h2>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#cbd5e1;">
                Thank you for your genuine interest in joining <strong style="color:#ffffff;">IEEE ECU Student Branch</strong> and taking the time to participate in our recruitment process for:
              </p>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:rgba(100,116,139,0.15);border-left:4px solid #94a3b8;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 8px 0;font-size:14px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">
                      Committee
                    </p>
                    <p style="margin:0;font-size:17px;font-weight:700;color:#ffffff;">
                      {{team}}
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#cbd5e1;">
                Due to a remarkably high volume of applications and strictly limited team capacities, we are unfortunately unable to offer you a position in this committee for the current cycle.
              </p>
              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#cbd5e1;">
                Please remember that this decision does not reflect your inherent potential or talents. Our public workshops, hackathons, and open technical events remain fully accessible to you, and we sincerely encourage you to apply again in future seasons.
              </p>
              <p style="margin:24px 0 0 0;font-size:15px;line-height:1.6;color:#cbd5e1;">
                We wish you the very best in your academic and professional endeavors!
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 30px;background-color:#011c38;text-align:center;border-top:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0 0 6px 0;font-size:13px;color:#94a3b8;">
                IEEE ECU Student Branch • Egyptian Chinese University
              </p>
              <p style="margin:0;font-size:12px;color:#64748b;">
                Inspiring Innovation, Empowering Engineers.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>'
);
