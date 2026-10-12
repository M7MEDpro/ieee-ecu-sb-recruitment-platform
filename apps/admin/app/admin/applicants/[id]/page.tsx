'use client';

/**
 * @file applicants/[id]/page.tsx
 * @brief In-Depth Applicant Dossier, Evaluation Review, and Committee Decision Studio.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  CreditCard,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Check,
  X,
  AlertCircle,
  Save,
  Play,
  Trash2,
  MessageSquare,
  Copy,
  ExternalLink,
  Send,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { invalidateClientCache, getClientCached } from '@/lib/clientCache';
import { SkeletonDossier } from '@/components/Skeletons';
import { DecisionStatus, formatTimeTo12h } from '@ieee-recruitment/shared';
import { CriteriaDescription } from '@/components/CriteriaDescription';

function getScoreTextColor(score: number, max: number = 10): string {
  if (max <= 5) {
    if (score <= 1) return 'text-rose-400';
    if (score === 2) return 'text-orange-400';
    if (score === 3) return 'text-amber-400';
    if (score === 4) return 'text-emerald-400';
    return 'text-cyan-400';
  }
  const ratio = max > 0 ? score / max : 1;
  if (ratio <= 0.3) return 'text-rose-400';
  if (ratio <= 0.6) return 'text-amber-400';
  if (ratio <= 0.8) return 'text-emerald-400';
  return 'text-cyan-400';
}

export default function ApplicantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const applicantId = params.id as string;

  const [applicant, setApplicant] = useState<any>(null);
  const [criteria, setCriteria] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [decisions, setDecisions] = useState<Record<string, DecisionStatus>>({});
  const [savingDecision, setSavingDecision] = useState<string | null>(null);
  const [generatingWhatsApp, setGeneratingWhatsApp] = useState(false);
  const [whatsAppData, setWhatsAppData] = useState<{ message: string; waUrl: string | null; phone: string } | null>(null);
  const [customizedWAMessage, setCustomizedWAMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [copiedWA, setCopiedWA] = useState(false);
  const [quotas, setQuotas] = useState<Array<any>>([]);

  const [navCandidates, setNavCandidates] = useState<{
    prev: any | null;
    next: any | null;
    currentIdx: number;
    total: number;
  }>({
    prev: null,
    next: null,
    currentIdx: -1,
    total: 0,
  });

  useEffect(() => {
    const cachedList = getClientCached<any[]>('applicants_ALL_');
    const updateNav = (list: any[]) => {
      const idx = list.findIndex((a) => a.id === applicantId);
      if (idx !== -1) {
        setNavCandidates({
          prev: idx > 0 ? list[idx - 1] : null,
          next: idx < list.length - 1 ? list[idx + 1] : null,
          currentIdx: idx + 1,
          total: list.length,
        });
      }
    };

    if (cachedList && cachedList.length > 0) {
      updateNav(cachedList);
    } else {
      fetch('/api/applicants?filter=ALL')
        .then((r) => r.json())
        .then((d) => {
          if (d?.success && Array.isArray(d.applicants)) {
            updateNav(d.applicants);
          }
        })
        .catch(() => {});
    }
  }, [applicantId]);

  const fetchDetail = async () => {
    try {
      const [appRes, critRes, quotaRes] = await Promise.all([
        fetch(`/api/applicants/${applicantId}`),
        fetch('/api/criteria'),
        fetch('/api/quotas'),
      ]);

      const appData = await appRes.json();
      const critData = await critRes.json();
      const quotaData = await quotaRes.json().catch(() => null);

      if (appData.success) {
        setApplicant(appData.applicant);
        setDecisions(appData.applicant.decisions || {});
      }
      if (critData.success) {
        setCriteria(critData.criteria);
      }
      if (quotaData?.success && Array.isArray(quotaData.quotas)) {
        setQuotas(quotaData.quotas);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    const handleFocus = () => fetchDetail();
    window.addEventListener('focus', handleFocus);
    const interval = setInterval(fetchDetail, 10000);
    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [applicantId]);

  const handleToggleReviewed = async () => {
    if (!applicant) return;

    if (!applicant.isReviewed) {
      // Validate that all applied committees have an explicit decision (not PENDING)
      const unDecidedTeams = (applicant.teams || []).filter((t: any) => {
        const dec = decisions[t.id];
        return !dec || dec === 'PENDING';
      });

      if (unDecidedTeams.length > 0) {
        alert(
          `Please select an Accept or Reject decision for all applied committees before marking as reviewed:\n- ${unDecidedTeams.map((t: any) => t.name).join('\n- ')}`
        );
        return;
      }

      // Check if interview evaluation is present or interview marked completed
      const isCompleted = applicant.interview?.status === 'COMPLETED' || applicant.evaluation;
      if (!isCompleted) {
        alert('Cannot mark as reviewed: The candidate interview must be conducted and submitted first.');
        return;
      }
    }

    try {
      const res = await fetch(`/api/applicants/${applicantId}/review`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setApplicant((prev: any) => ({ ...prev, isReviewed: data.isReviewed }));
        invalidateClientCache('applicants');
        invalidateClientCache('admin_dashboard_stats');
        if (data.isReviewed) {
          // Pre-load WhatsApp preview for immediate 1-click dispatch
          handleOpenWhatsAppDecision(false);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetDecision = async (
    teamId: string,
    decision: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WAITLISTED'
  ) => {
    setSavingDecision(teamId);
    try {
      const res = await fetch(`/api/applicants/${applicantId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, decision }),
      });
      const data = await res.json();
      if (data.success) {
        setDecisions((prev) => ({ ...prev, [teamId]: decision }));
        // Refresh quotas
        fetch('/api/quotas')
          .then((r) => r.json())
          .then((qd) => {
            if (qd?.success && Array.isArray(qd.quotas)) setQuotas(qd.quotas);
          })
          .catch(() => {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingDecision(null);
    }
  };

  const handleToggleDecisionWhatsappSent = async (status: 'NOT_SENT' | 'SENT') => {
    try {
      const res = await fetch('/api/whatsapp/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicantId, action: 'MARK_SENT', status }),
      });
      const data = await res.json();
      if (data.success) {
        setApplicant((prev: any) => ({
          ...prev,
          decisionWhatsappStatus: status,
          decisionWhatsappSentAt: status === 'SENT' ? new Date().toISOString() : null,
        }));
        invalidateClientCache('applicants');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenWhatsAppDecision = async (autoOpen: boolean = true) => {
    setGeneratingWhatsApp(true);
    try {
      const res = await fetch('/api/whatsapp/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicantId }),
      });
      const data = await res.json();
      if (data.success) {
        setWhatsAppData(data);
        setCustomizedWAMessage(data.message || '');
        if (autoOpen && data.waUrl) {
          window.open(data.waUrl, '_blank');
          handleToggleDecisionWhatsappSent('SENT');
        } else if (!autoOpen) {
          setShowPreview(true);
        }
      } else {
        alert(data.error || 'Failed to generate WhatsApp decision message.');
      }
    } catch (err: any) {
      alert(err.message || 'Error communicating with server.');
    } finally {
      setGeneratingWhatsApp(false);
    }
  };

  const handleCopyWhatsAppMessage = async () => {
    const textToCopy = customizedWAMessage || whatsAppData?.message;
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedWA(true);
      setTimeout(() => setCopiedWA(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteApplicant = async () => {
    if (!applicant) return;
    if (!confirm(`Are you sure you want to permanently delete applicant "${applicant.fullName}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/applicants/${applicantId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete applicant.');
      }
      invalidateClientCache('applicants');
      invalidateClientCache('admin_dashboard_stats');
      router.push('/admin/applicants');
    } catch (err: any) {
      alert(err.message || 'Error deleting applicant.');
      setDeleting(false);
    }
  };

  if (loading) {
    return <SkeletonDossier />;
  }

  if (!applicant) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-white text-lg font-bold">Applicant Not Found</p>
        <Link href="/admin/applicants" className="text-xs text-[#00a1c0] hover:underline">
          Return to directory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Top Breadcrumbs & Fast Carousel Switcher */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Link
            href="/admin/applicants"
            className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10"
          >
            <ArrowLeft size={14} />
            <span>Directory</span>
          </Link>

          {navCandidates.total > 0 && (
            <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-xl px-2 py-1 text-xs">
              <Link
                href={navCandidates.prev ? `/admin/applicants/${navCandidates.prev.id}` : '#'}
                aria-disabled={!navCandidates.prev}
                className={`p-1 rounded-lg transition flex items-center gap-1 ${
                  navCandidates.prev
                    ? 'text-slate-300 hover:text-white hover:bg-white/10'
                    : 'text-slate-600 pointer-events-none'
                }`}
                title={navCandidates.prev ? `Previous: ${navCandidates.prev.fullName}` : 'No previous candidate'}
              >
                <ChevronLeft size={14} />
                <span className="hidden sm:inline text-[11px] font-semibold">Prev</span>
              </Link>

              <span className="font-mono text-[11px] px-1 text-slate-400">
                {navCandidates.currentIdx} / {navCandidates.total}
              </span>

              <Link
                href={navCandidates.next ? `/admin/applicants/${navCandidates.next.id}` : '#'}
                aria-disabled={!navCandidates.next}
                className={`p-1 rounded-lg transition flex items-center gap-1 ${
                  navCandidates.next
                    ? 'text-slate-300 hover:text-white hover:bg-white/10'
                    : 'text-slate-600 pointer-events-none'
                }`}
                title={navCandidates.next ? `Next: ${navCandidates.next.fullName}` : 'No next candidate'}
              >
                <span className="hidden sm:inline text-[11px] font-semibold">Next</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          )}
        </div>

        {/* Actions Row */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {applicant.isReviewed ? (
            <button
              type="button"
              onClick={() => {
                handleOpenWhatsAppDecision(false);
                document.getElementById('whatsapp-dispatch-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              disabled={generatingWhatsApp || (!applicant?.phoneNumber && !applicant?.phone)}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#25D366]/25 transition active:scale-95 disabled:opacity-50"
            >
              <MessageSquare size={14} className="fill-slate-950" />
              <span>{generatingWhatsApp ? 'Opening...' : 'Dispatch WhatsApp'}</span>
            </button>
          ) : applicant.interview?.status === 'COMPLETED' || applicant.evaluation ? (
            <button
              onClick={handleToggleReviewed}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00a1c0] to-[#023260] hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#00a1c0]/20 transition"
            >
              <CheckCircle2 size={14} />
              <span>Mark as Reviewed</span>
            </button>
          ) : (
            <Link
              href={`/hr/interview/${applicant.id}`}
              title="Start live interview session immediately (even if unscheduled or no email sent)"
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition"
            >
              <Play size={13} fill="currentColor" />
              <span>Start Interview</span>
            </Link>
          )}

          {/* Reviewed Status Toggle (allows reverting if needed) */}
          {applicant.isReviewed && (
            <>
              <button
                onClick={handleToggleReviewed}
                className="px-3 py-2 rounded-xl text-xs font-bold transition border bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30 text-center"
              >
                Status: Reviewed
              </button>

              <button
                type="button"
                onClick={() =>
                  handleToggleDecisionWhatsappSent(
                    applicant.decisionWhatsappStatus === 'SENT' ? 'NOT_SENT' : 'SENT'
                  )
                }
                className={`px-3 py-2 rounded-xl text-xs font-bold transition border flex items-center justify-center gap-1.5 ${
                  applicant.decisionWhatsappStatus === 'SENT'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                }`}
                title="Click to toggle decision WhatsApp sent status"
              >
                <Check size={12} />
                <span>
                  {applicant.decisionWhatsappStatus === 'SENT' ? 'WA Decision: Sent' : 'WA: Pending Send'}
                </span>
              </button>
            </>
          )}

          {/* Delete Applicant */}
          <button
            onClick={handleDeleteApplicant}
            disabled={deleting}
            title="Delete Applicant Record Permanently"
            className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 size={13} />
            <span>{deleting ? 'Deleting...' : 'Delete'}</span>
          </button>
        </div>
      </div>

      {/* Header Profile Card */}
      <div className="admin-card rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              {applicant.fullName}
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              National ID: {applicant.nationalId} • Submitted on {new Date(applicant.createdAt).toLocaleDateString()}
            </p>
          </div>

          {/* Quick Summary Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {applicant.teams?.map((team: any) => (
              <span
                key={team.id}
                className="px-3 py-1 rounded-full text-xs font-bold bg-[#00a1c0]/20 text-[#00a1c0] border border-[#00a1c0]/30"
              >
                {team.name} ({team.broadCategory === 'TECH' ? 'Tech' : 'Non-Tech'})
              </span>
            ))}
          </div>
        </div>

        {/* Contact Info Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-1">
            <span className="text-slate-400 block">Phone Number (WhatsApp)</span>
            <a
              href={`tel:${applicant.phoneNumber}`}
              className="text-emerald-400 hover:text-emerald-300 font-mono font-bold text-sm inline-flex items-center gap-1.5 transition"
              title="Call Candidate Phone"
            >
              <Phone size={13} />
              <span>{applicant.phoneNumber}</span>
            </a>
          </div>

          <div className="bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-1">
            <span className="text-slate-400 block">Email Address</span>
            {applicant.email ? (
              <a
                href={`mailto:${applicant.email}`}
                className="text-white hover:text-[#00a1c0] font-mono font-bold text-sm truncate inline-flex items-center gap-1.5 transition block"
                title="Send Candidate Email"
              >
                <Mail size={13} className="text-slate-400 shrink-0" />
                <span className="truncate">{applicant.email}</span>
              </a>
            ) : (
              <span className="text-slate-500 font-mono text-sm block">Not provided (WhatsApp only)</span>
            )}
          </div>

          <div className="bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-1">
            <span className="text-slate-400 block">Interview Status</span>
            <span className="text-[#00a1c0] font-bold text-sm block">
              {applicant.interview
                ? `${applicant.interview.status} (${applicant.interview.date}${applicant.interview.startTime ? ` • ${formatTimeTo12h(applicant.interview.startTime)}` : ''})`
                : 'Unscheduled'}
            </span>
          </div>
        </div>
      </div>

      {/* Team Decisions Action Center */}
      <div className="admin-card rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="border-b border-white/10 pb-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <CheckCircle2 size={20} className="text-[#00a1c0]" />
            Independent Committee Decisions
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Per recruitment governance, each applied committee can be marked Accepted or Rejected independently.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {applicant.teams?.map((team: any) => {
            const currentDec = decisions[team.id] || 'PENDING';
            const isSaving = savingDecision === team.id;
            const teamQuota = quotas.find((q: any) => q.teamId === team.id);

            return (
              <div
                key={team.id}
                className="bg-black/20 p-5 rounded-2xl border border-white/10 space-y-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base text-white">{team.name}</h3>
                    <span className="text-xs text-slate-400">
                      {team.broadCategory === 'TECH' ? 'Technical Committee' : 'Non-Technical Committee'}
                    </span>
                    {teamQuota && (
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5 font-mono">
                        <span>Target: {teamQuota.acceptedCount}/{teamQuota.targetQuota} accepted</span>
                        <span>•</span>
                        <span className="text-amber-400/90">WL: {teamQuota.waitlistedCount}</span>
                      </div>
                    )}
                  </div>

                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                      currentDec === 'ACCEPTED'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : currentDec === 'REJECTED'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : currentDec === 'WAITLISTED'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {currentDec}
                  </span>
                </div>

                {/* Decision Action Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <button
                    disabled={isSaving}
                    onClick={() => handleSetDecision(team.id, 'ACCEPTED')}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                      currentDec === 'ACCEPTED'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-white/5 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300'
                    }`}
                  >
                    <Check size={13} />
                    <span>Accept</span>
                  </button>

                  <button
                    disabled={isSaving}
                    onClick={() => handleSetDecision(team.id, 'WAITLISTED')}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                      currentDec === 'WAITLISTED'
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'bg-white/5 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300'
                    }`}
                  >
                    <Clock size={13} />
                    <span>Waitlist</span>
                  </button>

                  <button
                    disabled={isSaving}
                    onClick={() => handleSetDecision(team.id, 'REJECTED')}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                      currentDec === 'REJECTED'
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300'
                    }`}
                  >
                    <X size={13} />
                    <span>Reject</span>
                  </button>
                </div>

                {currentDec !== 'PENDING' && (
                  <button
                    disabled={isSaving}
                    onClick={() => handleSetDecision(team.id, 'PENDING')}
                    className="w-full py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold text-center transition"
                  >
                    Reset to Pending
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* WhatsApp Decision Dispatch */}
        <div id="whatsapp-dispatch-section" className="mt-6 pt-6 border-t border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <MessageSquare size={16} className="text-[#25D366]" />
                WhatsApp Decision Dispatch
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Dispatch combined candidate outcome and committee group links via WhatsApp.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleToggleDecisionWhatsappSent(applicant.decisionWhatsappStatus === 'SENT' ? 'NOT_SENT' : 'SENT')}
                className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition ${
                  applicant.decisionWhatsappStatus === 'SENT'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                }`}
                title="Manually toggle WhatsApp sent status"
              >
                <Check size={14} className={applicant.decisionWhatsappStatus === 'SENT' ? 'text-emerald-400' : 'text-slate-400'} />
                <span>{applicant.decisionWhatsappStatus === 'SENT' ? 'WA Sent' : 'Mark as Sent'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenWhatsAppDecision(false)}
                disabled={generatingWhatsApp}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 flex items-center justify-center gap-2 transition"
              >
                <FileText size={14} />
                <span>{showPreview ? 'Refresh Preview' : 'Preview Message'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenWhatsAppDecision(true)}
                disabled={generatingWhatsApp || (!applicant?.phoneNumber && !applicant?.phone)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-extrabold bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 shadow-lg shadow-[#25D366]/20 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
              >
                <MessageSquare size={16} className="fill-slate-950" />
                <span>{generatingWhatsApp ? 'Opening...' : 'Send WhatsApp Decision'}</span>
                <ExternalLink size={13} />
              </button>
            </div>
          </div>

          {/* Inline Message Preview Drawer */}
          {showPreview && whatsAppData && (
            <div className="bg-black/40 border border-emerald-500/20 rounded-2xl p-4 sm:p-5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <MessageSquare size={15} className="text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400">Message Preview</span>
                  <span className="text-[10px] bg-white/10 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                    +{whatsAppData.phone}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyWhatsAppMessage}
                    className="text-xs text-slate-300 hover:text-white flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg transition"
                  >
                    {copiedWA ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedWA ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-slate-400 hover:text-white text-xs flex items-center gap-1"
                  >
                    <X size={12} />
                    <span>Close</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <span>Customized WhatsApp Message for this Candidate (Editable prior to dispatch):</span>
                  </span>
                  <span className="text-slate-400 font-mono">
                    {customizedWAMessage.length} characters
                  </span>
                </div>
                <textarea
                  value={customizedWAMessage}
                  onChange={(e) => setCustomizedWAMessage(e.target.value)}
                  rows={8}
                  dir="rtl"
                  className="w-full bg-black/50 border border-white/10 focus:border-[#25D366] rounded-xl p-3 text-xs text-slate-100 outline-none leading-relaxed font-sans"
                  placeholder="Type or edit the personalized WhatsApp message for this applicant here..."
                />
              </div>

              {whatsAppData.phone && (
                <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[11px] text-slate-400">
                    You can edit any portion of the message above and click the button to dispatch via WhatsApp directly.
                  </span>
                  <a
                    href={`https://api.whatsapp.com/send?phone=${whatsAppData.phone}&text=${encodeURIComponent(customizedWAMessage || whatsAppData.message)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleToggleDecisionWhatsappSent('SENT')}
                    className="px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#25D366]/20 transition"
                  >
                    <MessageSquare size={13} className="fill-slate-950" />
                    <span>Open in WhatsApp with Customized Text</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Calculated Averages & Evaluation Results */}
      <div className="admin-card rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="border-b border-white/10 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <FileText size={20} className="text-[#00a1c0]" />
              Interview Evaluation & Score Breakdown
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Assessed by assigned HR and corresponding committee Heads in a single session.
            </p>
          </div>

          <span
            className={`text-xs px-3 py-1 rounded-full font-bold ${
              applicant.evaluation ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
            }`}
          >
            {applicant.evaluation ? 'Evaluation Completed' : 'Pending Evaluation'}
          </span>
        </div>

        {/* Averages Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-black/30 p-4 rounded-2xl border border-white/10 text-center">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              General Average
            </span>
            <span className="text-3xl font-extrabold text-white mt-1 block">
              {applicant.evaluation?.generalAverage !== null && applicant.evaluation?.generalAverage !== undefined
                ? applicant.evaluation.generalAverage
                : '—'}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Universal branch criteria</span>
          </div>

          <div className="bg-black/30 p-4 rounded-2xl border border-white/10 text-center">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Tech Average
            </span>
            <span className="text-3xl font-extrabold text-[#00a1c0] mt-1 block">
              {applicant.evaluation?.techAverage !== null && applicant.evaluation?.techAverage !== undefined
                ? applicant.evaluation.techAverage
                : 'N/A'}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              {applicant.teams?.some((t: any) => t.broadCategory === 'TECH')
                ? 'Technical criteria'
                : 'Did not apply for Tech'}
            </span>
          </div>

          <div className="bg-black/30 p-4 rounded-2xl border border-white/10 text-center">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Non-Tech Average
            </span>
            <span className="text-3xl font-extrabold text-purple-400 mt-1 block">
              {applicant.evaluation?.nonTechAverage !== null && applicant.evaluation?.nonTechAverage !== undefined
                ? applicant.evaluation.nonTechAverage
                : 'N/A'}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              {applicant.teams?.some((t: any) => t.broadCategory === 'NON_TECH')
                ? 'Operations / Media criteria'
                : 'Did not apply for Non-Tech'}
            </span>
          </div>
        </div>

        {/* Free-form Notes Section */}
        {applicant.evaluation && (
          <div className="space-y-4 pt-4 border-t border-white/10">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider">
              Interviewer Free-Form Notes
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-1.5">
                <span className="text-xs font-bold text-white block">General Notes:</span>
                <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {applicant.evaluation.generalNotes || 'No notes provided.'}
                </p>
              </div>

              {applicant.teams?.some((t: any) => t.broadCategory === 'TECH') && (
                <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-1.5">
                  <span className="text-xs font-bold text-[#00a1c0] block">Tech Notes:</span>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {applicant.evaluation.techNotes || 'No notes provided.'}
                  </p>
                </div>
              )}

              {applicant.teams?.some((t: any) => t.broadCategory === 'NON_TECH') && (
                <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-1.5">
                  <span className="text-xs font-bold text-purple-400 block">Non-Tech Notes:</span>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {applicant.evaluation.nonTechNotes || 'No notes provided.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Criteria Breakdown List (Scores & Written Assessments) */}
        {applicant.evaluation && (applicant.evaluation.scores || applicant.evaluation.textResponses) && (
          <div className="space-y-4 pt-4 border-t border-white/10">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center justify-between">
              <span>Detailed Evaluation Breakdown</span>
              <span className="text-xs font-normal text-slate-400 lowercase">scores & qualitative assessments</span>
            </h3>

            <div className="divide-y divide-white/5 rounded-xl border border-white/10 bg-black/20 overflow-hidden">
              {criteria.map((crit) => {
                const score = applicant.evaluation.scores?.[crit.id];
                const textResponse = applicant.evaluation.textResponses?.[crit.id];

                if (score === undefined && !textResponse) return null;

                if (textResponse) {
                  return (
                    <div key={crit.id} className="p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{crit.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                            Written Assessment
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">{crit.section}</span>
                      </div>
                      {crit.description && (
                        <CriteriaDescription description={crit.description} />
                      )}
                      <div className="p-3 rounded-xl bg-black/40 border border-indigo-500/20 text-slate-200 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                        {textResponse}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={crit.id} className="p-3.5 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white block">{crit.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({crit.section})</span>
                      </div>
                      {crit.description && (
                        <CriteriaDescription description={crit.description} />
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-start pt-0.5">
                      <span className={`font-mono text-base font-extrabold ${getScoreTextColor(score, crit.maxScore)}`}>{score}</span>
                      <span className="text-slate-500">/ {crit.maxScore}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
