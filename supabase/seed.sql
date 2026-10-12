-- ==============================================================================
-- IEEE ECU Student Branch — Production Database Seed
-- @file seed.sql
-- @author Senior Full-Stack Software Architect
-- @since 2026-09-18
-- ==============================================================================

-- 1. SEED CANONICAL TEAMS
INSERT INTO public.teams (id, name, broad_category, conceptual_category, required_head_category, description, color) VALUES
('general-tech', 'General', 'TECH', 'TECH', 'TECH_HEAD', 'Core engineering, embedded systems, and prototype innovation', '#023260'),
('software', 'Software', 'TECH', 'TECH', 'TECH_HEAD', 'Full-stack engineering, algorithms, competitive programming, and web platforms', '#00a1c0'),
('hardware', 'Hardware', 'TECH', 'TECH', 'TECH_HEAD', 'PCB layout, microcontrollers, robotics, and circuit architecture', '#1e40af'),
('pr-logistics', 'PR & Logistics', 'NON_TECH', 'OPERATIONS', 'PR_HEAD', 'Partnership negotiations, logistics procurement, and event operations', '#b45309'),
('events', 'Events', 'NON_TECH', 'OPERATIONS', 'EVENTS_HEAD', 'Event concept execution, crowd engagement, and stage management', '#be123c'),
('hr', 'HR', 'NON_TECH', 'OPERATIONS', 'HR_HEAD', 'Member evaluations, branch culture, performance appraisals, and bonding', '#4338ca'),
('visuals', 'Visuals', 'NON_TECH', 'MEDIA', 'MEDIA_HEAD', 'Cinematic video production, storytelling, and motion editing', '#0f766e'),
('graphics', 'Graphics', 'NON_TECH', 'MEDIA', 'MEDIA_HEAD', 'Brand visual design, typography, posters, and digital asset creation', '#7c3aed'),
('marketing', 'Marketing', 'NON_TECH', 'MEDIA', 'MEDIA_HEAD', 'Campaign marketing, social media growth, and content copy', '#c2410c')
ON CONFLICT (id) DO UPDATE SET
name = EXCLUDED.name,
broad_category = EXCLUDED.broad_category,
conceptual_category = EXCLUDED.conceptual_category,
required_head_category = EXCLUDED.required_head_category,
description = EXCLUDED.description,
color = EXCLUDED.color;

-- 2. SEED FULL ADMIN (Initial master administrative credential)
-- Replace the bcrypt hash below with your custom administrator password hash
INSERT INTO public.admins (id, username, name, password_hash)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'admin',
    'Executive Administrator',
    '$2a$10$I6osfi6fsAPwFh4aYfZ2GOt/CPd61r8kZC80ypdHyeidhkX12aEG2'
)
ON CONFLICT (username) DO NOTHING;

-- Initial HR Accounts (Initial seed accounts)
-- Replace the bcrypt hash below with your custom HR password hash
INSERT INTO public.hr_accounts (id, name, password_hash)
VALUES 
    ('b0000000-0000-0000-0000-000000000001', 'Sarah HR', '$2a$10$5naYWWpnJ9eQdNvK9MRFX.r0W4UG.4NtMf/iW5F1Hvor3rvSCa20G'),
    ('b0000000-0000-0000-0000-000000000002', 'Omar HR', '$2a$10$5naYWWpnJ9eQdNvK9MRFX.r0W4UG.4NtMf/iW5F1Hvor3rvSCa20G')
ON CONFLICT (name) DO NOTHING;

-- 3. SEED DYNAMIC EVALUATION CRITERIA
INSERT INTO public.evaluation_criteria (name, section, team_category, description, min_score, max_score, order_index, is_active) VALUES
-- General Criteria (Shown for all applicants)
('Communication & Articulation', 'GENERAL', 'ALL', 'Clarity of thought, active listening, and concise verbal expression', 1, 10, 1, true),
('Commitment & Availability', 'GENERAL', 'ALL', 'Dedication to season deadlines, university workload balance, and attendance', 1, 10, 2, true),
('Teamwork & Culture Fit', 'GENERAL', 'ALL', 'Collaborative attitude, peer respect, ego management, and enthusiasm', 1, 10, 3, true),
('Critical Thinking & Adaptability', 'GENERAL', 'ALL', 'Ability to think on their feet when faced with unexpected constraints', 1, 10, 4, true),

-- Tech Criteria
('Fundamental Technical Knowledge', 'TECH', 'ALL', 'Core concepts relevant to the applicant''s technological domain', 1, 10, 10, true),
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

-- 4. SEED HTML EMAIL TEMPLATES
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
          <!-- Header Banner -->
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
          <!-- Body Content -->
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
              <!-- Info Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:rgba(0,161,192,0.12);border-left:4px solid #00a1c0;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 8px 0;font-size:14px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">
                      Applied Committee(s)
                    </p>
                    <p style="margin:0;font-size:17px;font-weight:700;color:#ffffff;">
                      {{team}}
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
          <!-- Footer -->
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
          <!-- Header Banner -->
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
          <!-- Body Content -->
          <tr>
            <td style="padding:36px 32px;background-color:#023260;">
              <h2 style="margin:0 0 16px 0;font-size:22px;color:#ffffff;font-weight:700;">
                Congratulations, {{name}}! 🎉
              </h2>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#cbd5e1;">
                On behalf of the High Board and Executive Council, we are thrilled to officially welcome you to the <strong style="color:#ffffff;">IEEE ECU Student Branch</strong>!
              </p>
              <!-- Accepted Committee Box -->
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
          <!-- Footer -->
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
          <!-- Header Banner -->
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
          <!-- Body Content -->
          <tr>
            <td style="padding:36px 32px;background-color:#023260;">
              <h2 style="margin:0 0 16px 0;font-size:20px;color:#ffffff;font-weight:700;">
                Dear {{name}},
              </h2>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#cbd5e1;">
                Thank you for your genuine interest in joining <strong style="color:#ffffff;">IEEE ECU Student Branch</strong> and taking the time to participate in our recruitment process for:
              </p>
              <!-- Committee Box -->
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
          <!-- Footer -->
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
)
ON CONFLICT (id) DO UPDATE SET
subject = EXCLUDED.subject,
body_html = EXCLUDED.body_html,
updated_at = now();
