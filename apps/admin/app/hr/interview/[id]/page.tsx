'use client';

/**
 * @file hr/interview/[id]/page.tsx
 * @brief Dynamic HR Live Evaluation Studio & Real-time Candidate Assessment.
 * @details Features automatic instant timer start, restart timer tool, seamless overtime
 *          grace period without form interruptions, smart Next Interview fast-switcher,
 *          color-coded 1-10 scoring scales, and unrestricted Master Admin override.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-20
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import HRNavbar from '@/components/HRNavbar';
import { invalidateClientCache } from '@/lib/clientCache';
import { CriteriaDescription } from '@/components/CriteriaDescription';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  BarChart3,
  Info,
  Calendar,
  Phone,
  Mail,
  HelpCircle,
  Send,
  ShieldAlert,
  ChevronRight,
  UserCheck,
  UserX,
  FastForward,
  ExternalLink,
  MapPin,
  Globe,
  GraduationCap,
} from 'lucide-react';
import { formatTimeTo12h } from '@ieee-recruitment/shared';

interface Criterion {
  id: string;
  name: string;
  section: 'GENERAL' | 'TECH' | 'NON_TECH';
  teamCategory: string;
  description?: string;
  responseType?: 'SCORE' | 'PARAGRAPH';
  minScore: number;
  maxScore: number;
  orderIndex: number;
  isActive: boolean;
}

interface InterviewSession {
  id: string;
  applicantId: string;
  applicant: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    nationalId: string;
    faculty?: string;
    academicLevel?: string;
  };
  appliedTeams: Array<{
    id: string;
    name: string;
    category?: 'TECH' | 'NON_TECH';
    broadCategory?: 'TECH' | 'NON_TECH';
  }>;
  assignedHeads: Array<{
    name: string;
    category: string;
  }>;
  hrId: string;
  hrName: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  interviewMode?: 'ONLINE' | 'OFFLINE';
  location?: string;
  meetingLink?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'SEMI_COMPLETED' | 'CANCELLED';
  evaluation?: {
    generalNotes?: string;
    techNotes?: string;
    nonTechNotes?: string;
    generalAverage?: number | null;
    techAverage?: number | null;
    nonTechAverage?: number | null;
    status?: 'COMPLETED' | 'SEMI_COMPLETED';
    scores: Record<string, number>;
    textResponses?: Record<string, string>;
  } | null;
}

export default function LiveInterviewEvaluationPage() {
  const params = useParams();
  const router = useRouter();
  const interviewId = params.id as string;

  const [sessionData, setSessionData] = useState<InterviewSession | null>(null);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'FULL_ADMIN' | 'HR' | null>(null);
  const [completionStatus, setCompletionStatus] = useState<'COMPLETED' | 'SEMI_COMPLETED'>('COMPLETED');

  // Timer & Real-time Evaluation State
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [nextSlot, setNextSlot] = useState<any | null>(null);

  // Evaluation Form State
  const [scores, setScores] = useState<Record<string, number>>({});
  const [textResponses, setTextResponses] = useState<Record<string, string>>({});
  const [generalNotes, setGeneralNotes] = useState('');
  const [techNotes, setTechNotes] = useState('');
  const [nonTechNotes, setNonTechNotes] = useState('');

  // Draft & Collision Prevention State
  const [restoredDraftTime, setRestoredDraftTime] = useState<string | null>(null);
  const [collisionWarning, setCollisionWarning] = useState<{ id: string; name: string; secondsAgo: number } | null>(null);

  // Fetch Session, Auth & Dynamic Criteria
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [intRes, critRes, meRes, schedRes] = await Promise.all([
        fetch(`/api/evaluations?interviewId=${interviewId}`),
        fetch('/api/criteria'),
        fetch('/api/auth/me'),
        fetch('/api/schedule'),
      ]);

      const intData = await intRes.json();
      if (!intData.success) throw new Error(intData.error || 'Failed to load interview session.');

      const critData = await critRes.json();
      if (!critData.success) throw new Error(critData.error || 'Failed to load evaluation criteria.');

      const meData = await meRes.json().catch(() => null);
      if (meData?.authenticated && meData?.user?.role) {
        setUserRole(meData.user.role);
      }

      const session: InterviewSession = intData.interview;
      setSessionData(session);
      setCriteria(critData.criteria || []);

      // Auto-start interview immediately when opened (No manual button barrier)
      if (session.status === 'SCHEDULED') {
        fetch('/api/evaluations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'START', interviewId }),
        }).catch((err) => console.warn('[AutoStart] Background trigger warning:', err));
        setSessionData((prev) => (prev ? { ...prev, status: 'IN_PROGRESS' } : null));
      }

      // Pre-fill existing evaluation if any
      if (session.evaluation) {
        setScores(session.evaluation.scores || {});
        setTextResponses(session.evaluation.textResponses || {});
        setGeneralNotes(session.evaluation.generalNotes || '');
        setTechNotes(session.evaluation.techNotes || '');
        setNonTechNotes(session.evaluation.nonTechNotes || '');
        if (session.evaluation.status === 'SEMI_COMPLETED' || session.status === 'SEMI_COMPLETED') {
          setCompletionStatus('SEMI_COMPLETED');
        } else {
          setCompletionStatus('COMPLETED');
        }
      } else if (session.status === 'SEMI_COMPLETED') {
        setCompletionStatus('SEMI_COMPLETED');
      }

      // Detect Next Upcoming Interview Slot
      const schedData = await schedRes.json().catch(() => null);
      if (schedData?.success && Array.isArray(schedData.slots)) {
        const upcoming = schedData.slots.filter(
          (s: any) =>
            s.id !== session.id &&
            s.applicantId !== session.applicantId &&
            s.status !== 'COMPLETED'
        );

        if (upcoming.length > 0) {
          upcoming.sort((a: any, b: any) => {
            const dateCmp = (a.date || '').localeCompare(b.date || '');
            if (dateCmp !== 0) return dateCmp;
            return (a.startTime || '').localeCompare(b.startTime || '');
          });
          setNextSlot(upcoming[0]);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (interviewId) {
      loadData();
    }
  }, [interviewId]);

  // Auto-Save Draft in localStorage
  useEffect(() => {
    if (!interviewId || !sessionData || sessionData.status === 'COMPLETED') return;
    const hasContent = Object.keys(scores).length > 0 || Object.keys(textResponses).length > 0 || generalNotes || techNotes || nonTechNotes;
    if (!hasContent) return;

    const draft = {
      scores,
      textResponses,
      generalNotes,
      techNotes,
      nonTechNotes,
      timestamp: new Date().toISOString(),
    };
    try {
      localStorage.setItem(`interview_draft_${interviewId}`, JSON.stringify(draft));
    } catch (e) {
      console.warn('[Draft] Failed to save draft:', e);
    }
  }, [interviewId, sessionData, scores, textResponses, generalNotes, techNotes, nonTechNotes]);

  // Restore Draft on initial load
  useEffect(() => {
    if (!interviewId) return;
    try {
      const raw = localStorage.getItem(`interview_draft_${interviewId}`);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft && sessionData?.status !== 'COMPLETED') {
          if (draft.scores && Object.keys(draft.scores).length > 0) setScores(draft.scores);
          if (draft.textResponses && Object.keys(draft.textResponses).length > 0) setTextResponses(draft.textResponses);
          if (draft.generalNotes) setGeneralNotes(draft.generalNotes);
          if (draft.techNotes) setTechNotes(draft.techNotes);
          if (draft.nonTechNotes) setNonTechNotes(draft.nonTechNotes);
          const timeStr = draft.timestamp ? new Date(draft.timestamp).toLocaleTimeString() : 'earlier';
          setRestoredDraftTime(timeStr);
        }
      }
    } catch (e) {
      console.warn('[Draft] Failed to restore draft:', e);
    }
  }, [interviewId, sessionData?.id]);

  const handleClearDraft = () => {
    try {
      localStorage.removeItem(`interview_draft_${interviewId}`);
    } catch {}
    setRestoredDraftTime(null);
    setScores({});
    setTextResponses({});
    setGeneralNotes('');
    setTechNotes('');
    setNonTechNotes('');
  };

  // Collision Detection Heartbeat
  useEffect(() => {
    if (!interviewId || sessionData?.status === 'COMPLETED') return;

    const sendHeartbeat = async () => {
      try {
        const res = await fetch(`/api/interviews/${interviewId}/heartbeat`, { method: 'POST' });
        const data = await res.json();
        if (data.success && data.collision && data.activeInterviewer) {
          setCollisionWarning(data.activeInterviewer);
        } else if (data.success && !data.collision) {
          setCollisionWarning(null);
        }
      } catch {}
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 15000);

    const release = () => {
      fetch(`/api/interviews/${interviewId}/heartbeat`, {
        method: 'DELETE',
        keepalive: true,
      }).catch(() => {});
    };

    window.addEventListener('beforeunload', release);
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', release);
      release();
    };
  }, [interviewId, sessionData?.status]);

  // Live Stopwatch Interval
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Determine Tracks Applied For
  const applicantTeamIds = useMemo(() => {
    const ids = new Set<string>();
    sessionData?.appliedTeams?.forEach((t: any) => {
      if (t.id) ids.add(t.id.toLowerCase());
      if (t.name) ids.add(t.name.toLowerCase());
    });
    return ids;
  }, [sessionData]);

  const hasTech = useMemo(() => {
    return (
      sessionData?.appliedTeams.some(
        (t) => (t as any).broadCategory === 'TECH' || (t as any).category === 'TECH'
      ) ?? false
    );
  }, [sessionData]);

  const hasNonTech = useMemo(() => {
    return (
      sessionData?.appliedTeams.some(
        (t) => (t as any).broadCategory === 'NON_TECH' || (t as any).category === 'NON_TECH'
      ) ?? false
    );
  }, [sessionData]);

  // Filter Active Criteria Dynamically
  const visibleCriteria = useMemo(() => {
    return criteria.filter((c) => {
      if (!c.isActive) return false;
      if (c.section === 'GENERAL') return true;
      const cat = (c.teamCategory || '').trim();
      const catUpper = cat.toUpperCase();
      const catLower = cat.toLowerCase();

      if (c.section === 'TECH') {
        if (!hasTech) return false;
        if (!cat || catUpper === 'ALL' || catUpper === 'TECH') return true;
        return applicantTeamIds.has(catLower);
      }
      if (c.section === 'NON_TECH') {
        if (!hasNonTech) return false;
        if (!cat || catUpper === 'ALL' || catUpper === 'NON_TECH') return true;
        return applicantTeamIds.has(catLower);
      }
      return false;
    });
  }, [criteria, hasTech, hasNonTech, applicantTeamIds]);

  const generalCriteria = useMemo(
    () => visibleCriteria.filter((c) => c.section === 'GENERAL'),
    [visibleCriteria]
  );
  const techCriteria = useMemo(
    () => visibleCriteria.filter((c) => c.section === 'TECH'),
    [visibleCriteria]
  );
  const nonTechCriteria = useMemo(
    () => visibleCriteria.filter((c) => c.section === 'NON_TECH'),
    [visibleCriteria]
  );

  // Live Dynamic Average Calculation (only SCORE-type criteria)
  const averages = useMemo(() => {
    const calc = (list: Criterion[]) => {
      const scorable = list.filter((c) => c.responseType !== 'PARAGRAPH');
      if (scorable.length === 0) return null;
      let total = 0;
      let scoredCount = 0;
      let maxScoreTotal = 0;
      for (const item of scorable) {
        if (scores[item.id] !== undefined) {
          total += scores[item.id];
          maxScoreTotal += item.maxScore || 10;
          scoredCount++;
        }
      }
      const defaultMax = scorable[0]?.maxScore || 10;
      if (scoredCount === 0) return { avg: null, max: defaultMax };
      const avg = Math.round((total / scoredCount) * 10) / 10;
      const avgMax = Math.round((maxScoreTotal / scoredCount) * 10) / 10;
      return { avg, max: avgMax };
    };

    return {
      general: calc(generalCriteria),
      tech: hasTech ? calc(techCriteria) : null,
      nonTech: hasNonTech ? calc(nonTechCriteria) : null,
    };
  }, [scores, generalCriteria, techCriteria, nonTechCriteria, hasTech, hasNonTech]);

  // Handle Score Input
  const handleScoreChange = (criterionId: string, value: number) => {
    setScores((prev) => ({
      ...prev,
      [criterionId]: value,
    }));
  };

  // Handle Paragraph Text Response Input
  const handleTextResponseChange = (criterionId: string, value: string) => {
    setTextResponses((prev) => ({
      ...prev,
      [criterionId]: value,
    }));
  };

  // Restart Interview Timer Tool
  const handleRestartTimer = () => {
    setElapsedSeconds(0);
    setIsTimerRunning(true);
  };

  // Mark Candidate Absent / No-Show
  const handleMarkNoShow = async () => {
    if (!sessionData) return;
    if (
      !confirm(
        `Are you sure you want to mark "${sessionData.applicant?.fullName}" as Absent / No-Show? This will record them as absent and unlock your next candidate.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set-status',
          slotId: sessionData.id,
          status: 'NO_SHOW',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update candidate status.');
      invalidateClientCache('schedule_slots');
      invalidateClientCache('applicants');
      setSuccessMessage(`Candidate "${sessionData.applicant?.fullName}" has been marked as Absent / No-Show.`);
      setSessionData((prev) => (prev ? { ...prev, status: 'NO_SHOW' as any } : null));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'Error updating status to Absent.');
    }
  };

  // Handle Submit Evaluation
  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionData) return;

    // Check if at least one score or text response is provided
    const scoredKeys = Object.keys(scores);
    const textKeys = Object.keys(textResponses).filter((k) => textResponses[k]?.trim());
    if (scoredKeys.length === 0 && textKeys.length === 0) {
      setError('Please score at least one criterion or provide a written assessment before submitting.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewId: sessionData.id || interviewId,
          applicantId: sessionData.applicantId,
          generalNotes,
          techNotes: hasTech ? techNotes : '',
          nonTechNotes: hasNonTech ? nonTechNotes : '',
          scores,
          textResponses,
          completionStatus,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to submit evaluation.');

      try {
        localStorage.removeItem(`interview_draft_${interviewId}`);
      } catch {}
      setRestoredDraftTime(null);

      setSuccessMessage(
        completionStatus === 'SEMI_COMPLETED'
          ? 'Interview marked as Semi Complete & evaluation recorded.'
          : 'Evaluation scores and notes recorded successfully.'
      );
      setSessionData((prev) => (prev ? { ...prev, status: completionStatus } : null));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Duration & Overtime Calculations
  const targetDurationMinutes = sessionData?.durationMinutes || 12;
  const targetDurationSeconds = targetDurationMinutes * 60;
  const remainingSeconds = targetDurationSeconds - elapsedSeconds;
  const isOvertime = remainingSeconds < 0;
  const overtimeSeconds = Math.abs(remainingSeconds);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  // Multi-Scale Adaptive Color Coding (Supports 1-5, 1-10, 1-15, or custom scales)
  type ScoreTier = 'red' | 'orange' | 'amber' | 'emerald' | 'cyan';

  const getScoreTier = (val: number, maxScore: number = 10): ScoreTier => {
    if (maxScore <= 5) {
      if (val <= 1) return 'red';
      if (val === 2) return 'orange';
      if (val === 3) return 'amber';
      if (val === 4) return 'emerald';
      return 'cyan';
    }
    if (maxScore <= 10) {
      if (val <= 3) return 'red';
      if (val <= 6) return 'amber';
      if (val <= 8) return 'emerald';
      return 'cyan';
    }
    if (maxScore <= 15) {
      if (val <= 4) return 'red';
      if (val <= 6) return 'orange';
      if (val <= 9) return 'amber';
      if (val <= 12) return 'emerald';
      return 'cyan';
    }
    // Generic fallback for any scale
    const ratio = maxScore > 0 ? val / maxScore : 1;
    if (ratio <= 0.25) return 'red';
    if (ratio <= 0.45) return 'orange';
    if (ratio <= 0.65) return 'amber';
    if (ratio <= 0.85) return 'emerald';
    return 'cyan';
  };

  const getScoreButtonClasses = (val: number, isSelected: boolean, maxScore: number = 10) => {
    const tier = getScoreTier(val, maxScore);
    switch (tier) {
      case 'red':
        if (isSelected) {
          return 'bg-gradient-to-br from-rose-600 to-red-700 text-white font-black shadow-lg shadow-rose-600/40 ring-2 ring-rose-400 scale-110 z-10 border border-rose-300';
        }
        return 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/25 border border-rose-500/25';
      case 'orange':
        if (isSelected) {
          return 'bg-gradient-to-br from-orange-500 to-amber-600 text-slate-950 font-black shadow-lg shadow-orange-500/40 ring-2 ring-orange-300 scale-110 z-10 border border-orange-200';
        }
        return 'bg-orange-500/10 text-orange-300 hover:bg-orange-500/25 border border-orange-500/25';
      case 'amber':
        if (isSelected) {
          return 'bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 font-black shadow-lg shadow-amber-500/40 ring-2 ring-amber-300 scale-110 z-10 border border-amber-200';
        }
        return 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/25 border border-amber-500/25';
      case 'emerald':
        if (isSelected) {
          return 'bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 font-black shadow-lg shadow-emerald-500/40 ring-2 ring-emerald-300 scale-110 z-10 border border-emerald-200';
        }
        return 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/25';
      case 'cyan':
      default:
        if (isSelected) {
          return 'bg-gradient-to-br from-cyan-400 to-teal-400 text-slate-950 font-black shadow-lg shadow-cyan-500/40 ring-2 ring-cyan-200 scale-110 z-10 border border-cyan-100';
        }
        return 'bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/25';
    }
  };

  const getScoreBadgeClasses = (val?: number, maxScore: number = 10) => {
    if (val === undefined) return 'bg-white/5 text-slate-400 border-white/10';
    const tier = getScoreTier(val, maxScore);
    switch (tier) {
      case 'red':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-black';
      case 'orange':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40 font-black';
      case 'amber':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-black';
      case 'emerald':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-black';
      case 'cyan':
      default:
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-black';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#02182B] text-slate-100 flex flex-col">
        <HRNavbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 border-4 border-[#00a1c0] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-slate-300 font-medium">Loading candidate interview studio...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-[#02182B] text-slate-100 flex flex-col">
        <HRNavbar />
        <div className="flex-1 max-w-xl mx-auto p-8 flex flex-col items-center justify-center text-center">
          <AlertCircle className="text-red-400 mb-3" size={48} />
          <h2 className="text-xl font-bold text-white">Interview Not Found</h2>
          <p className="text-xs text-slate-400 mt-2">
            The interview session does not exist or you do not have permission to view it.
          </p>
          <Link
            href="/admin/scheduling"
            className="mt-6 px-5 py-2.5 rounded-xl bg-[#00a1c0] text-[#02182B] text-xs font-bold"
          >
            Return to Scheduling Timeline
          </Link>
        </div>
      </div>
    );
  }

  const isCompleted = sessionData.status === 'COMPLETED';
  const isSemiCompleted = sessionData.status === 'SEMI_COMPLETED';
  const isSubmitted = isCompleted || isSemiCompleted;
  const isInProgress = sessionData.status === 'IN_PROGRESS';
  const isNoShow = (sessionData.status as string) === 'NO_SHOW';
  const isAdmin = userRole === 'FULL_ADMIN';

  return (
    <div className="min-h-screen bg-[#02182B] text-slate-100 flex flex-col">
      <HRNavbar hrName={sessionData.hrName} />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-6 pb-24">
        {/* Top Navigation & Status Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Link
            href={isAdmin ? '/admin/scheduling' : '/hr'}
            className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 w-fit"
          >
            <ArrowLeft size={14} />
            <span>{isAdmin ? 'Back to Master Schedule' : 'Back to My Queue'}</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mark Absent / No-Show Button */}
            {!isSubmitted && !isNoShow && (
              <button
                type="button"
                onClick={handleMarkNoShow}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 transition flex items-center gap-1.5 active:scale-95 shadow-sm"
                title="Mark candidate as absent / no-show"
              >
                <UserX size={13} className="text-rose-400" />
                <span>Candidate Absent</span>
              </button>
            )}

            {/* Admin Override Badge */}
            {isAdmin && (
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 shadow-sm">
                <ShieldAlert size={12} className="text-rose-400" />
                <span>Admin Master Override</span>
              </span>
            )}

            {/* Live Session Status */}
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                isNoShow
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : isInProgress
                  ? 'bg-[#00a1c0]/20 text-[#00a1c0] border-[#00a1c0]/40 animate-pulse'
                  : isCompleted
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : isSemiCompleted
                  ? 'bg-amber-500/25 text-amber-300 border-amber-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}
            >
              {isNoShow
                ? 'Candidate Absent (No-Show)'
                : isInProgress
                ? 'Live Session In Progress'
                : isCompleted
                ? 'Evaluation Completed'
                : isSemiCompleted
                ? 'Semi Completed'
                : 'Scheduled'}
            </span>
          </div>
        </div>

        {/* Collision Prevention Alert Banner */}
        {collisionWarning && (
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 flex items-start gap-3 animate-pulse">
            <AlertCircle size={20} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold">Caution: Concurrent Evaluation Session Detected</p>
              <p className="text-amber-300/90">
                <strong>{collisionWarning.name}</strong> is currently active on this candidate&apos;s interview (last active {collisionWarning.secondsAgo} seconds ago). Please coordinate to prevent overwriting scores.
              </p>
            </div>
          </div>
        )}

        {/* Local Unsaved Draft Restored Banner */}
        {restoredDraftTime && (
          <div className="p-3.5 rounded-2xl bg-[#00a1c0]/15 border border-[#00a1c0]/30 text-white flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#00a1c0]" />
              <span>Restored unsaved draft from <strong>{restoredDraftTime}</strong>.</span>
            </div>
            <button
              type="button"
              onClick={handleClearDraft}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition font-semibold text-[11px]"
            >
              Clear Draft
            </button>
          </div>
        )}

        {/* Candidate Profile Card & Interactive Live Timer */}
        <div className="p-6 rounded-3xl bg-[#022344] border border-white/10 shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                {sessionData.applicant?.fullName || 'Candidate'}
              </h1>
              {sessionData.applicant?.faculty && (
                <span className="px-2.5 py-1 rounded-lg bg-[#00a1c0]/20 border border-[#00a1c0]/40 text-[#00a1c0] text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  <GraduationCap size={14} />
                  <span>{sessionData.applicant.faculty}</span>
                </span>
              )}
              {sessionData.applicant?.nationalId && (
                <span className="px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-400 text-xs font-mono">
                  ID: {sessionData.applicant.nationalId}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
              {sessionData.applicant?.phoneNumber && (
                <a
                  href={`tel:${sessionData.applicant.phoneNumber}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-bold text-xs hover:bg-emerald-500/25 transition"
                  title="Click to call candidate"
                >
                  <Phone size={12} className="text-emerald-400" />
                  <span>{sessionData.applicant.phoneNumber}</span>
                </a>
              )}
              {sessionData.applicant?.email && (
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Mail size={13} className="text-[#00a1c0]" />
                  <span>{sessionData.applicant.email}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-slate-400">
                <Calendar size={13} className="text-[#00a1c0]" />
                <span>{sessionData.date} ({formatTimeTo12h(sessionData.startTime)} – {formatTimeTo12h(sessionData.endTime)})</span>
              </div>
            </div>

            {/* Applied Committee Tracks */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                Applied Tracks:
              </span>
              {sessionData.appliedTeams.map((team) => (
                <span
                  key={team.id}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                    team.category === 'TECH'
                      ? 'bg-[#00a1c0]/20 text-[#00a1c0] border-[#00a1c0]/40'
                      : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                  }`}
                >
                  {team.name} ({team.category === 'TECH' ? 'Technical' : 'Non-Technical'})
                </span>
              ))}
            </div>
          </div>

          {/* Real-time Stopwatch & Control Center */}
          <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Live Stopwatch Clock */}
            <div
              className={`px-4 py-3 rounded-2xl border flex flex-col items-center justify-center min-w-[150px] transition-all shadow-inner ${
                isOvertime
                  ? 'bg-rose-950/70 border-rose-500/60 text-rose-300 shadow-rose-900/40'
                  : 'bg-black/40 border-[#00a1c0]/30 text-white shadow-black/60'
              }`}
            >
              <div className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                <Clock size={12} className={isOvertime ? 'text-rose-400 animate-pulse' : 'text-[#00a1c0]'} />
                <span>{isOvertime ? 'Overtime Elapsed' : 'Interview Clock'}</span>
              </div>

              <div className="text-2xl font-black font-mono tabular-nums mt-0.5 tracking-wider">
                {isOvertime ? `+${formatTime(overtimeSeconds)}` : formatTime(remainingSeconds)}
              </div>

              <div className="text-[10px] text-slate-400 mt-0.5">
                Target: {targetDurationMinutes} mins
              </div>
            </div>

            {/* Restart Timer Button */}
            <button
              type="button"
              onClick={handleRestartTimer}
              className="px-3.5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition flex items-center justify-center gap-2"
              title="Reset interview timer to 00:00"
            >
              <RotateCcw size={14} className="text-amber-400" />
              <span>Restart Timer</span>
            </button>

            {/* Direct Link to Candidate Full Profile */}
            <Link
              href={`/admin/applicants/${sessionData.applicantId}`}
              target="_blank"
              className="px-3.5 py-3 rounded-2xl bg-white/5 hover:bg-[#00a1c0]/20 text-slate-300 hover:text-[#00a1c0] border border-white/10 text-xs font-bold transition flex items-center justify-center gap-2"
              title="Open full application submission in new tab"
            >
              <ExternalLink size={14} />
              <span>Full Profile</span>
            </Link>
          </div>
        </div>

        {/* Next Interview Sidebar / Quick Switcher */}
        {nextSlot && (
          <div className="p-4 rounded-2xl bg-[#011c38]/90 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                <FastForward size={18} />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block">
                  Next Interview Slot
                </span>
                <span className="text-sm font-bold text-white">
                  {nextSlot.applicantName || 'Candidate'}
                </span>
                <span className="text-xs text-slate-400 ml-2 font-mono">
                  ({formatTimeTo12h(nextSlot.startTime)} – {formatTimeTo12h(nextSlot.endTime)}) • {nextSlot.appliedTeams?.join(', ')}
                </span>
              </div>
            </div>

            <Link
              href={`/hr/interview/${nextSlot.applicantId || nextSlot.id}`}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 flex-shrink-0"
            >
              <span>Switch to Next Interview</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        )}

        {/* Gentle Overtime Notice (Does NOT interrupt or close the form!) */}
        {isOvertime && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle size={18} className="text-amber-400 flex-shrink-0" />
              <span>
                <strong>Time Alert:</strong> The scheduled interview duration has ended (+{formatTime(overtimeSeconds)}). The evaluation form remains fully open to comfortably record your scores and notes without any auto-closing.
              </span>
            </div>
            {nextSlot && (
              <Link
                href={`/hr/interview/${nextSlot.applicantId || nextSlot.id}`}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 font-bold text-[11px] whitespace-nowrap transition"
              >
                Ready for Next Candidate
              </Link>
            )}
          </div>
        )}

        {/* Live Averages Bar */}
        <div className="p-5 rounded-3xl bg-gradient-to-r from-[#011c38] to-[#022344] border border-[#00a1c0]/30 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-white text-sm font-black">
              <BarChart3 size={18} className="text-[#00a1c0]" />
              <span>Live Calculated Category Averages</span>
            </div>

            <div className="grid grid-cols-3 gap-3 w-full sm:w-auto">
              {/* General Average */}
              <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  General
                </div>
                <div className="text-base sm:text-lg font-black text-white mt-0.5">
                  {averages.general && averages.general.avg !== null
                    ? `${averages.general.avg}/${averages.general.max}`
                    : '—'}
                </div>
              </div>

              {/* Tech Average */}
              <div className="px-4 py-2 rounded-xl bg-[#00a1c0]/10 border border-[#00a1c0]/30 text-center">
                <div className="text-[10px] uppercase font-bold text-[#00a1c0] tracking-wider">
                  Technical
                </div>
                <div className="text-base sm:text-lg font-black text-white mt-0.5">
                  {!hasTech ? (
                    <span className="text-slate-500 font-medium text-xs">N/A</span>
                  ) : averages.tech && averages.tech.avg !== null ? (
                    `${averages.tech.avg}/${averages.tech.max}`
                  ) : (
                    '—'
                  )}
                </div>
              </div>

              {/* Non-Tech Average */}
              <div className="px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-center">
                <div className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                  Non-Tech
                </div>
                <div className="text-base sm:text-lg font-black text-white mt-0.5">
                  {!hasNonTech ? (
                    <span className="text-slate-500 font-medium text-xs">N/A</span>
                  ) : averages.nonTech && averages.nonTech.avg !== null ? (
                    `${averages.nonTech.avg}/${averages.nonTech.max}`
                  ) : (
                    '—'
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
            <AlertCircle size={18} className="flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="flex-shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
            {nextSlot && (
              <Link
                href={`/hr/interview/${nextSlot.applicantId || nextSlot.id}`}
                className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition"
              >
                <span className="inline-flex items-center gap-1">
                  Proceed to Next Candidate
                  <ChevronRight size={13} />
                </span>
              </Link>
            )}
          </div>
        )}

        {/* Evaluation Form */}
        <form onSubmit={handleSubmitEvaluation} className="space-y-8">
          {/* 1. GENERAL CRITERIA SECTION */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#022344]/80 border border-white/10 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00a1c0]"></span>
                  1. General Evaluation Criteria
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Universal criteria applied to every branch candidate (Communication, Culture Fit, Commitment).
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {generalCriteria.map((criterion) => {
                const isParagraph = criterion.responseType === 'PARAGRAPH';
                const currentScore = scores[criterion.id];
                const currentText = textResponses[criterion.id] || '';
                return (
                  <div
                    key={criterion.id}
                    className="p-4 rounded-2xl bg-[#011c38]/60 border border-white/5 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          {criterion.name}
                          {isParagraph && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                              Written
                            </span>
                          )}
                        </div>
                        {criterion.description && (
                          <CriteriaDescription description={criterion.description} />
                        )}
                      </div>

                      {!isParagraph && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-medium">Score:</span>
                          <span className={`w-9 h-7 rounded-lg border text-sm flex items-center justify-center ${getScoreBadgeClasses(currentScore, criterion.maxScore)}`}>
                            {currentScore !== undefined ? currentScore : '—'}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">/ {criterion.maxScore}</span>
                        </div>
                      )}
                    </div>

                    {isParagraph ? (
                      <textarea
                        rows={4}
                        value={currentText}
                        onChange={(e) => handleTextResponseChange(criterion.id, e.target.value)}
                        placeholder={`Write your assessment for "${criterion.name}"...`}
                        className="w-full bg-[#011c38] text-sm text-white placeholder-slate-500 rounded-2xl p-4 border border-indigo-500/20 focus:outline-none focus:border-indigo-400 transition"
                      />
                    ) : (
                      <div className="grid grid-cols-5 sm:flex sm:flex-wrap gap-1.5 pt-1">
                        {Array.from(
                          { length: criterion.maxScore - criterion.minScore + 1 },
                          (_, idx) => criterion.minScore + idx
                        ).map((val) => {
                          const isSelected = currentScore === val;
                          return (
                            <button
                              type="button"
                              key={val}
                              onClick={() => handleScoreChange(criterion.id, val)}
                              className={`w-full sm:w-9 h-9 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer ${getScoreButtonClasses(
                                val,
                                isSelected,
                                criterion.maxScore
                              )}`}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* General Section Notes */}
            <div className="space-y-2 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  General Section Notes & Observations
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 mr-0.5">Quick tags:</span>
                  {[
                    'Strong communicator',
                    'High enthusiasm',
                    'Clear bilingual clarity',
                    'Time management concern',
                    'High commitment',
                    'Proactive mindset',
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setGeneralNotes((prev) => (prev ? `${prev.trim()}; ${tag}` : tag))}
                      className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-[#00a1c0]/20 text-slate-300 hover:text-[#00a1c0] border border-white/10 text-[11px] transition cursor-pointer"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                rows={3}
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="Communication style, energy, questions asked, and behavioral remarks..."
                className="w-full bg-[#011c38] text-sm text-white placeholder-slate-500 rounded-2xl p-4 border border-white/10 focus:outline-none focus:border-[#00a1c0]"
              />
            </div>
          </div>

          {/* 2. TECHNICAL CRITERIA SECTION */}
          {hasTech && (
            <div className="p-6 sm:p-8 rounded-3xl bg-[#022344]/80 border border-[#00a1c0]/30 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00a1c0]"></span>
                    2. Technical Evaluation Criteria
                  </h2>
                  <p className="text-xs text-[#00a1c0] mt-0.5 font-medium">
                    Visible because candidate applied for Technical Committees.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {techCriteria.map((criterion) => {
                  const isParagraph = criterion.responseType === 'PARAGRAPH';
                  const currentScore = scores[criterion.id];
                  const currentText = textResponses[criterion.id] || '';
                  return (
                    <div
                      key={criterion.id}
                      className="p-4 rounded-2xl bg-[#011c38]/60 border border-white/5 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-white flex items-center gap-2">
                            {criterion.name}
                            {isParagraph && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                                Written
                              </span>
                            )}
                          </div>
                          {criterion.description && (
                            <CriteriaDescription description={criterion.description} />
                          )}
                        </div>

                        {!isParagraph && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-medium">Score:</span>
                            <span className={`w-9 h-7 rounded-lg border text-sm flex items-center justify-center ${getScoreBadgeClasses(currentScore, criterion.maxScore)}`}>
                              {currentScore !== undefined ? currentScore : '—'}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">/ {criterion.maxScore}</span>
                          </div>
                        )}
                      </div>

                      {isParagraph ? (
                        <textarea
                          rows={4}
                          value={currentText}
                          onChange={(e) => handleTextResponseChange(criterion.id, e.target.value)}
                          placeholder={`Write your technical assessment for "${criterion.name}"...`}
                          className="w-full bg-[#011c38] text-sm text-white placeholder-slate-500 rounded-2xl p-4 border border-[#00a1c0]/20 focus:outline-none focus:border-[#00a1c0] transition"
                        />
                      ) : (
                        <div className="grid grid-cols-5 sm:flex sm:flex-wrap gap-1.5 pt-1">
                          {Array.from(
                            { length: criterion.maxScore - criterion.minScore + 1 },
                            (_, idx) => criterion.minScore + idx
                          ).map((val) => {
                            const isSelected = currentScore === val;
                            return (
                              <button
                                type="button"
                                key={val}
                                onClick={() => handleScoreChange(criterion.id, val)}
                                className={`w-full sm:w-9 h-9 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer ${getScoreButtonClasses(
                                  val,
                                  isSelected,
                                  criterion.maxScore
                                )}`}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Technical Section Notes */}
              <div className="space-y-2 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Technical Section Notes & Problem Solving Assessment
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-[#00a1c0] mr-0.5">Quick tags:</span>
                    {[
                      'Solid technical depth',
                      'Strong problem-solving',
                      'Practical projects',
                      'Git/Tool fluency',
                      'Needs foundational study',
                    ].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setTechNotes((prev) => (prev ? `${prev.trim()}; ${tag}` : tag))}
                        className="px-2 py-0.5 rounded-md bg-[#00a1c0]/10 hover:bg-[#00a1c0]/25 text-[#00a1c0] border border-[#00a1c0]/20 text-[11px] transition cursor-pointer"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={3}
                  value={techNotes}
                  onChange={(e) => setTechNotes(e.target.value)}
                  placeholder="Technical depth, practical projects, algorithmic logic, tool proficiency..."
                  className="w-full bg-[#011c38] text-sm text-white placeholder-slate-500 rounded-2xl p-4 border border-white/10 focus:outline-none focus:border-[#00a1c0]"
                />
              </div>
            </div>
          )}

          {/* 3. NON-TECHNICAL CRITERIA SECTION */}
          {hasNonTech && (
            <div className="p-6 sm:p-8 rounded-3xl bg-[#022344]/80 border border-indigo-500/30 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
                    3. Non-Technical Evaluation Criteria
                  </h2>
                  <p className="text-xs text-indigo-300 mt-0.5 font-medium">
                    Visible because candidate applied for Non-Technical Committees.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {nonTechCriteria.map((criterion) => {
                  const isParagraph = criterion.responseType === 'PARAGRAPH';
                  const currentScore = scores[criterion.id];
                  const currentText = textResponses[criterion.id] || '';
                  return (
                    <div
                      key={criterion.id}
                      className="p-4 rounded-2xl bg-[#011c38]/60 border border-white/5 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-white flex items-center gap-2">
                            {criterion.name}
                            {isParagraph && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                                Written
                              </span>
                            )}
                          </div>
                          {criterion.description && (
                            <CriteriaDescription description={criterion.description} dotColor="bg-purple-400" />
                          )}
                        </div>

                        {!isParagraph && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-medium">Score:</span>
                            <span className={`w-9 h-7 rounded-lg border text-sm flex items-center justify-center ${getScoreBadgeClasses(currentScore, criterion.maxScore)}`}>
                              {currentScore !== undefined ? currentScore : '—'}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">/ {criterion.maxScore}</span>
                          </div>
                        )}
                      </div>

                      {isParagraph ? (
                        <textarea
                          rows={4}
                          value={currentText}
                          onChange={(e) => handleTextResponseChange(criterion.id, e.target.value)}
                          placeholder={`Write your assessment for "${criterion.name}"...`}
                          className="w-full bg-[#011c38] text-sm text-white placeholder-slate-500 rounded-2xl p-4 border border-indigo-500/20 focus:outline-none focus:border-indigo-400 transition"
                        />
                      ) : (
                        <div className="grid grid-cols-5 sm:flex sm:flex-wrap gap-1.5 pt-1">
                          {Array.from(
                            { length: criterion.maxScore - criterion.minScore + 1 },
                            (_, idx) => criterion.minScore + idx
                          ).map((val) => {
                            const isSelected = currentScore === val;
                            return (
                              <button
                                type="button"
                                key={val}
                                onClick={() => handleScoreChange(criterion.id, val)}
                                className={`w-full sm:w-9 h-9 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer ${getScoreButtonClasses(
                                  val,
                                  isSelected,
                                  criterion.maxScore
                                )}`}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Non-Technical Section Notes */}
              <div className="space-y-2 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Non-Technical Section Notes & Assessment
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-indigo-400 mr-0.5">Quick tags:</span>
                    {[
                      'Organized & detail-focused',
                      'Creative ideation',
                      'Crisis handling ready',
                      'PR / negotiation mindset',
                      'Visual sense',
                    ].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setNonTechNotes((prev) => (prev ? `${prev.trim()}; ${tag}` : tag))}
                        className="px-2 py-0.5 rounded-md bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/20 text-[11px] transition cursor-pointer"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={3}
                  value={nonTechNotes}
                  onChange={(e) => setNonTechNotes(e.target.value)}
                  placeholder="Creative portfolio review, event crisis handling, PR negotiation mindset, storytelling..."
                  className="w-full bg-[#011c38] text-sm text-white placeholder-slate-500 rounded-2xl p-4 border border-white/10 focus:outline-none focus:border-[#00a1c0]"
                />
              </div>
            </div>
          )}

          {/* Persistent Submission Bar */}
          <div className="p-6 rounded-3xl bg-[#022344] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 shadow-2xl backdrop-blur-md z-30">
            <div className="text-xs text-slate-400 text-center sm:text-left space-y-1">
              <div>Ensure all evaluated criteria reflect consensus with attending committee heads.</div>
              <div className="text-slate-300 font-semibold">
                {Object.keys(scores).length} of {visibleCriteria.length} applicable criteria scored.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              {/* Semi-Complete vs Completed selector */}
              <div className="flex items-center rounded-2xl bg-black/40 p-1 border border-white/10 self-center sm:self-auto">
                <button
                  type="button"
                  onClick={() => setCompletionStatus('COMPLETED')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    completionStatus === 'COMPLETED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  <CheckCircle2 size={14} className={completionStatus === 'COMPLETED' ? 'text-emerald-400' : 'text-slate-400'} />
                  <span>Full Complete</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCompletionStatus('SEMI_COMPLETED')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    completionStatus === 'SEMI_COMPLETED'
                      ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-sm'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  <Clock size={14} className={completionStatus === 'SEMI_COMPLETED' ? 'text-amber-400' : 'text-slate-400'} />
                  <span>Semi Complete</span>
                </button>
              </div>

              {nextSlot && (
                <Link
                  href={`/hr/interview/${nextSlot.applicantId || nextSlot.id}`}
                  className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/15 text-xs font-bold transition flex items-center justify-center gap-1.5"
                  title="Move to next candidate without submitting"
                >
                  <FastForward size={14} className="text-emerald-400" />
                  <span>Next Candidate</span>
                </Link>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl transition flex-shrink-0 cursor-pointer disabled:opacity-50 ${
                  completionStatus === 'SEMI_COMPLETED'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 shadow-amber-500/25'
                    : 'bg-gradient-to-r from-[#023260] to-[#00a1c0] hover:brightness-110 shadow-[#00a1c0]/25'
                }`}
              >
                <Send size={16} />
                <span>
                  {submitting
                    ? 'Submitting Evaluation...'
                    : isSubmitted
                    ? completionStatus === 'SEMI_COMPLETED'
                      ? 'Update Semi Complete'
                      : 'Update Evaluation Scores'
                    : completionStatus === 'SEMI_COMPLETED'
                    ? 'Submit as Semi Complete'
                    : 'Submit Evaluation'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
