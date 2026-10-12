'use client';

/**
 * @file dashboard/page.tsx
 * @brief Real-Time Operational Overview & Recruitment Statistics.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  UserCheck,
  UserX,
  AlertTriangle,
  MessageSquare,
  Download,
  ArrowRight,
  Layers,
  Sparkles,
  RefreshCw,
  Lock,
  Loader2,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';
import { TEAMS } from '@ieee-recruitment/shared';
import { useDataCache } from '@/lib/clientCache';
import { SkeletonMetricsGrid } from '@/components/Skeletons';

export default function AdminDashboardPage() {
  const {
    data: stats,
    loading,
    isRevalidating,
    revalidate,
  } = useDataCache<any>(
    'admin_dashboard_stats',
    async () => {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch stats');
      return data.stats;
    },
    {
      freshMs: 5000,
      pollIntervalMs: 8000, // Rapid automatic background polling every 8s
      revalidateOnFocus: true, // Silent check when tab focused
    }
  );

  const [recruitmentStatus, setRecruitmentStatus] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = () => {
      fetch('/api/settings/recruitment-status', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => {
          if (d.success && (d.status === 'OPEN' || d.status === 'CLOSED')) {
            setRecruitmentStatus(d.status);
          }
        })
        .catch(() => {});
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);
    window.addEventListener('focus', fetchStatus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', fetchStatus);
    };
  }, []);

  const handleToggleRecruitmentStatus = async () => {
    const nextStatus = recruitmentStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
    const confirmText =
      nextStatus === 'CLOSED'
        ? 'Are you sure you want to CLOSE recruitment? Public applicant submissions will be blocked immediately.'
        : 'Are you sure you want to OPEN recruitment? The public application form will become active.';
    if (!window.confirm(confirmText)) return;

    setTogglingStatus(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/settings/recruitment-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, actorName: 'Admin Dashboard' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update recruitment status');
      setRecruitmentStatus(nextStatus);
      try {
        localStorage.setItem('ieee_recruitment_portal_status', nextStatus);
      } catch {}
      setStatusMessage(`Recruitment status changed to ${nextStatus}.`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Error changing status');
    } finally {
      setTogglingStatus(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="text-xs font-bold text-[#00a1c0] tracking-widest uppercase">
            Recruitment Command Center
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Operational Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time pipeline overview of IEEE ECU SB recruitment, scheduling & committee decisions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Auto-Sync (8s)</span>
          </div>

          <button
            onClick={() => revalidate()}
            disabled={isRevalidating}
            title="Refresh Live Metrics"
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition"
          >
            <RefreshCw size={14} className={isRevalidating ? 'animate-spin text-[#00a1c0]' : ''} />
          </button>

          <a
            href="/api/export/excel"
            download
            className="flex-1 sm:flex-none justify-center px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-semibold text-slate-200 hover:text-white transition flex items-center gap-1.5 shadow-sm text-center"
          >
            <Download size={14} />
            <span>Export</span>
          </a>

          <Link
            href="/admin/scheduling"
            className="flex-1 sm:flex-none justify-center px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#023260] to-[#00a1c0] hover:brightness-110 border border-[#00a1c0]/40 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-[#00a1c0]/25 text-center"
          >
            <Calendar size={14} />
            <span>Schedule</span>
          </Link>
        </div>
      </div>

      {/* Global Recruitment Gateway Switch Banner */}
      <div
        className={`rounded-3xl p-4 sm:p-5 border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          recruitmentStatus === 'OPEN'
            ? 'bg-emerald-950/40 border-emerald-500/30'
            : 'bg-amber-950/40 border-amber-500/30'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
              recruitmentStatus === 'OPEN'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}
          >
            {recruitmentStatus === 'OPEN' ? <CheckCircle2 size={20} /> : <Lock size={20} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Recruitment Submissions Gateway:
              </span>
              <span
                className={`px-2 py-0.5 rounded-full font-extrabold text-[11px] font-mono ${
                  recruitmentStatus === 'OPEN'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {recruitmentStatus}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {recruitmentStatus === 'OPEN'
                ? 'Public application form is active and accepting candidate submissions.'
                : 'Public application form is closed. Submissions are rejected with HTTP 403.'}
              {statusMessage && <span className="ml-2 text-white font-semibold">({statusMessage})</span>}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleRecruitmentStatus}
          disabled={togglingStatus}
          className={`w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md ${
            recruitmentStatus === 'OPEN'
              ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40'
              : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40'
          }`}
        >
          {togglingStatus ? (
            <Loader2 size={14} className="animate-spin" />
          ) : recruitmentStatus === 'OPEN' ? (
            <Lock size={14} />
          ) : (
            <CheckCircle2 size={14} />
          )}
          <span>
            {togglingStatus
              ? 'Updating...'
              : recruitmentStatus === 'OPEN'
              ? 'Close Recruitment'
              : 'Open Recruitment'}
          </span>
        </button>
      </div>

      {/* Primary Metrics Grid */}
      {loading && !stats ? (
        <SkeletonMetricsGrid count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Applicants */}
        <div className="admin-card admin-card-hover rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Applicants
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#023260] text-[#00a1c0] flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {loading ? '...' : stats?.totalApplicants ?? 0}
            </span>
            <span className="text-xs text-slate-400">submitted</span>
          </div>
          <div className="pt-2 border-t border-white/5 grid grid-cols-3 gap-1 text-center text-[11px] text-slate-400">
            <div className="bg-white/[0.03] p-1 rounded-lg">
              <span className="block text-[10px] text-slate-400">Tech</span>
              <span className="font-bold text-white">{stats?.techOnlyCount ?? 0}</span>
            </div>
            <div className="bg-white/[0.03] p-1 rounded-lg">
              <span className="block text-[10px] text-slate-400">Non-Tech</span>
              <span className="font-bold text-white">{stats?.nonTechOnlyCount ?? 0}</span>
            </div>
            <div className="bg-white/[0.03] p-1 rounded-lg">
              <span className="block text-[10px] text-slate-400">Both</span>
              <span className="font-bold text-[#00a1c0]">{stats?.bothCount ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Interviews Track */}
        <div className="admin-card admin-card-hover rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Scheduled Interviews
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-900/40 text-blue-400 flex items-center justify-center">
              <Calendar size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {loading ? '...' : stats?.scheduledInterviews ?? 0}
            </span>
            <span className="text-xs text-slate-400">total scheduled</span>
          </div>
          <div className="pt-2 border-t border-white/5 grid grid-cols-3 gap-1.5 text-center text-[11px]">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-1.5 rounded-lg">
              <span className="block text-[10px] text-slate-400 truncate">Completed</span>
              <span className="font-bold text-emerald-400">{stats?.completedInterviews ?? 0}</span>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 p-1.5 rounded-lg">
              <span className="block text-[10px] text-slate-400 truncate">Semi Complete</span>
              <span className="font-bold text-amber-300">{stats?.semiCompletedInterviews ?? 0}</span>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 p-1.5 rounded-lg">
              <span className="block text-[10px] text-slate-400 truncate">Pending</span>
              <span className="font-bold text-blue-400">{stats?.pendingInterviews ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Review Progress */}
        <div className="admin-card admin-card-hover rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Review Progress
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-900/30 text-amber-400 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {loading ? '...' : stats?.reviewedApplicants ?? 0}
            </span>
            <span className="text-xs text-slate-400">reviewed</span>
          </div>
          <div className="pt-2 border-t border-white/5">
            <Link
              href="/admin/applicants?filter=UNREVIEWED"
              className="w-full py-1.5 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-between transition"
            >
              <span>Pending Review: {stats?.unreviewedApplicants ?? 0}</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* Team Decisions */}
        <div className="admin-card admin-card-hover rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Decisions Recorded
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-900/30 text-purple-400 flex items-center justify-center">
              <UserCheck size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {loading ? '...' : (stats?.acceptedDecisions ?? 0) + (stats?.rejectedDecisions ?? 0)}
            </span>
            <span className="text-xs text-slate-400">total decisions</span>
          </div>
          <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-2 text-center text-[11px]">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-1.5 rounded-lg">
              <span className="block text-[10px] text-slate-400">Accepted</span>
              <span className="font-bold text-emerald-400">{stats?.acceptedDecisions ?? 0}</span>
            </div>
            <div className="bg-rose-500/10 border border-rose-500/20 p-1.5 rounded-lg">
              <span className="block text-[10px] text-slate-400">Rejected</span>
              <span className="font-bold text-rose-400">{stats?.rejectedDecisions ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Committee-by-Committee Application Count Grid (Interactive & Responsive) */}
      <div className="admin-card rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#00a1c0]/20 text-[#00c2e0] flex items-center justify-center">
              <Layers size={15} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Committee Applications Breakdown</h3>
              <p className="text-[11px] text-slate-400">
                Live total application volume per committee (HR, PR, Software, Events, etc.)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Total:</span>
            <span className="font-mono font-bold text-white px-2 py-0.5 rounded-md bg-white/10">
              {loading ? '...' : stats?.totalTeamApplications ?? 0} applications
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2.5">
          {TEAMS.map((team) => {
            const count = stats?.teamCounts?.[team.id] ?? 0;
            const total = stats?.totalTeamApplications || 1;
            const pct = Math.round((count / total) * 100);
            return (
              <Link
                key={team.id}
                href={`/admin/applicants`}
                className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/20 transition group flex flex-col justify-between space-y-2"
                title={`Filter applicants for ${team.name}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0 group-hover:scale-125 transition-transform"
                      style={{ backgroundColor: team.color }}
                    />
                    <span className="font-bold text-xs text-white truncate group-hover:text-[#00c2e0] transition">
                      {team.name}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-extrabold text-white group-hover:text-[#00c2e0] transition">
                      {loading ? '...' : count}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {pct}%
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        backgroundColor: team.color || '#00a1c0',
                      }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Second Row: Quick Operational Workflows */}
      <div className="admin-card rounded-2xl p-6 space-y-4">
        <div className="border-b border-white/5 pb-3">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <Sparkles size={18} className="text-[#00a1c0]" />
            Workflow Shortcuts
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            href="/admin/scheduling"
            className="p-4 rounded-xl bg-black/20 hover:bg-white/5 border border-white/10 hover:border-[#00c2e0]/30 transition-all space-y-2 group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#00c2e0]/10 border border-[#00c2e0]/20 text-[#00c2e0] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Calendar size={18} />
            </div>
            <h4 className="font-bold text-sm text-white">Scheduling & Timeline</h4>
            <p className="text-xs text-slate-400">
              Interactive interview slots, rooms, and timeline management.
            </p>
          </Link>

          <Link
            href="/admin/applicants"
            className="p-4 rounded-xl bg-black/20 hover:bg-white/5 border border-white/10 hover:border-amber-500/30 transition-all space-y-2 group"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users size={18} />
            </div>
            <h4 className="font-bold text-sm text-white">Applicants Directory</h4>
            <p className="text-xs text-slate-400">
              Search, filter scores, and manage committee decisions.
            </p>
          </Link>

          <Link
            href="/admin/whatsapp"
            className="p-4 rounded-xl bg-black/20 hover:bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-all space-y-2 group"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[#25D366] flex items-center justify-center group-hover:scale-105 transition-transform">
              <MessageSquare size={18} />
            </div>
            <h4 className="font-bold text-sm text-white">WhatsApp & Groups</h4>
            <p className="text-xs text-slate-400">
              Configure group links, message templates, and interview venues.
            </p>
          </Link>

          <Link
            href="/admin/hr-management"
            className="p-4 rounded-xl bg-black/20 hover:bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all space-y-2 group"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <UserCheck size={18} />
            </div>
            <h4 className="font-bold text-sm text-white">HR Management</h4>
            <p className="text-xs text-slate-400">
              Manage interviewer accounts and view login credentials.
            </p>
          </Link>
        </div>
      </div>

    </div>
  );
}
