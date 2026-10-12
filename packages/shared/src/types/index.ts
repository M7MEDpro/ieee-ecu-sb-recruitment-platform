/**
 * @file index.ts
 * @brief Core Domain Models and Type Definitions for IEEE ECU SB Recruitment System.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import { HeadCategory, TeamDefinition } from '../constants/teams.js';

export type UserRole = 'FULL_ADMIN' | 'HR';

export interface AdminAccount {
  id: string;
  username: string;
  name: string;
  role: 'FULL_ADMIN';
  createdAt: string;
}

export interface HRAccount {
  id: string;
  name: string;
  passwordHash?: string;
  plainPassword?: string;
  role: 'HR';
  createdAt: string;
  updatedAt: string;
}

export interface Applicant {
  id: string;
  fullName: string;
  phoneNumber: string;
  email?: string;
  nationalId: string;
  faculty?: string;
  academicLevel?: string;
  createdAt: string;
}

export interface ApplicantWithTeams extends Applicant {
  teams: TeamDefinition[];
  interviewStatus?: 'UNSCHEDULED' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'SEMI_COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  evaluationStatus?: 'PENDING' | 'COMPLETED' | 'SEMI_COMPLETED';
  generalAverage?: number | null;
  techAverage?: number | null;
  nonTechAverage?: number | null;
  isReviewed?: boolean;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  decisions?: Record<string, DecisionStatus>;
  decisionWhatsappStatus?: 'NOT_SENT' | 'SENT';
  decisionWhatsappSentAt?: string | null;
  decisionWhatsappSentBy?: string | null;
  interviewSchedule?: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    location?: string;
    meetingLink?: string;
    interviewMode?: 'ONLINE' | 'OFFLINE';
    status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'SEMI_COMPLETED' | 'CANCELLED' | 'NO_SHOW';
    hrId?: string | null;
    hrName?: string | null;
  } | null;
}

export interface HRAvailabilityWindow {
  id: string;
  hrId: string;
  hrName?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isAvailable: boolean;
}

export interface HeadAvailabilityWindow {
  id: string;
  headName: string;
  headCategory: HeadCategory;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isAvailable: boolean;
}

export interface InterviewScheduleSlot {
  id: string;
  applicantId: string;
  applicantName?: string;
  applicantEmail?: string;
  applicantPhone?: string;
  applicantFaculty?: string;
  appliedTeams: string[];
  hrId: string;
  hrName?: string;
  assignedHeadIds?: string[];
  assignedHeadNames?: string[];
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'SEMI_COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  isManualOverride: boolean;
  notes?: string;
  interviewMode?: 'ONLINE' | 'OFFLINE';
  location?: string;
  meetingLink?: string;
  venueId?: string;
  meetingLinkId?: string;
  whatsappStatus?: 'NOT_SENT' | 'SENT' | 'RESCHEDULED_PENDING';
  lastSentDate?: string;
  lastSentStartTime?: string;
  lastSentEndTime?: string;
  lastSentLocation?: string;
  lastSentMeetingLink?: string;
  lastSentMode?: 'ONLINE' | 'OFFLINE';
  whatsappSentAt?: string;
  activeInterviewerId?: string | null;
  activeInterviewerName?: string | null;
  lastActiveAt?: string | null;
  evaluationStatus?: 'PENDING' | 'COMPLETED' | 'SEMI_COMPLETED';
  generalAverage?: number | null;
  techAverage?: number | null;
  nonTechAverage?: number | null;
  totalAverage?: number | null;
}

export interface WhatsAppGroupLinks {
  familyLink: string;
  techMegaLink: string;
  mediaMegaLink: string;
  teamLinks: Record<string, string>; // teamId -> WhatsApp invite link
}

export interface VenueDefinition {
  id: string;
  name: string;
  type: 'OFFLINE' | 'ONLINE';
  details?: string;
  building?: string;
  googleMeetLink?: string;
}

export type WhatsAppMessageType =
  | 'INTERVIEW_INVITATION'
  | 'INTERVIEW_RESCHEDULED'
  | 'COMBINED_DECISION';

export interface WhatsAppTemplate {
  id: WhatsAppMessageType;
  title: string;
  template: string;
}

export type EvaluationSectionType = 'GENERAL' | 'TECH' | 'NON_TECH';

export interface EvaluationCriterion {
  id: string;
  name: string;
  section: EvaluationSectionType;
  teamCategory: string; // 'ALL' for General, or team ID
  description?: string;
  responseType?: 'SCORE' | 'PARAGRAPH';
  minScore: number;
  maxScore: number;
  orderIndex: number;
  isActive: boolean;
}

export interface EvaluationSubmission {
  id?: string;
  interviewId: string;
  applicantId: string;
  hrId: string;
  generalNotes?: string;
  techNotes?: string;
  nonTechNotes?: string;
  scores: Record<string, number>; // criterionId -> score
  textResponses?: Record<string, string>; // criterionId -> text response (for PARAGRAPH criteria)
  generalAverage?: number | null;
  techAverage?: number | null;
  nonTechAverage?: number | null;
  completionStatus?: 'COMPLETED' | 'SEMI_COMPLETED';
  status?: 'COMPLETED' | 'SEMI_COMPLETED';
  submittedAt?: string;
}

export type DecisionStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WAITLISTED';

export type RecruitmentStatus = 'OPEN' | 'CLOSED';

export interface CommitteeQuota {
  teamId: string;
  teamName: string;
  targetQuota: number;
  acceptedCount: number;
  waitlistedCount: number;
  totalApplied: number;
}

export interface TeamDecisionRecord {
  id?: string;
  applicantId: string;
  teamId: string;
  decision: DecisionStatus;
  decidedBy: string;
  decidedAt: string;
}

export type EmailType = 'INTERVIEW_INVITATION' | 'ACCEPTANCE' | 'REJECTION';

export interface EmailTemplate {
  id: string;
  type: EmailType;
  title: string;
  subject: string;
  bodyHtml: string;
  updatedAt: string;
}

export interface EmailLog {
  id: string;
  recipientEmail: string;
  applicantId?: string;
  applicantName?: string;
  emailType: EmailType;
  teamName?: string;
  subject: string;
  status: 'SENT' | 'FAILED';
  errorMessage?: string | null;
  retryCount: number;
  lastAttemptedAt: string;
  sentAt?: string | null;
}
