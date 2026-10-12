'use client';

/**
 * @file hr/page.tsx
 * @brief HR Interview Queue & Active Roster Dashboard.
 * @details Strictly scoped workspace for HR interviewers to view their assigned
 *          candidates, track progress, and enter live evaluation sessions.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import HRNavbar from '@/components/HRNavbar';
import {
  Calendar,
  Clock,
  User,
  Users,
  CheckCircle,
  PlayCircle,
  Play,
  AlertCircle,
  Phone,
  Mail,
  ArrowRight,
  RefreshCw,
  Award,
  PlusCircle,
  Search,
  X,
  GraduationCap,
} from 'lucide-react';
import {
  getClientCached,
  setClientCached,
  isClientCacheFresh,
} from '@/lib/clientCache';
import { SkeletonCardGrid, Skeleton } from '@/components/Skeletons';
import { formatTimeTo12h } from '@ieee-recruitment/shared';

interface AssignedInterview {
  id: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  applicantFaculty?: string;
  appliedTeams: Array<{ id: string; name: string; category: string }>;
  assignedHeads: string[];
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  isEvaluated: boolean;
}

export default function HRWorkspacePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [interviews, setInterviews] = useState<AssignedInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');

  // Direct interview modal for ANY applicant (even un-emailed or unscheduled)
  const [showDirectModal, setShowDirectModal] = useState(false);
  const [allApplicants, setAllApplicants] = useState<any[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchApplicantsForDirect = async () => {
    setLoadingApplicants(true);
    try {
      const res = await fetch('/api/applicants');
      const data = await res.json();
      if (data.success) {
        setAllApplicants(data.applicants || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingApplicants(false);
    }
  };

  const openDirectModal = () => {
    setShowDirectModal(true);
    if (allApplicants.length === 0) {
      fetchApplicantsForDirect();
    }
  };

  const filteredApplicants = useMemo(() => {
    if (!searchQuery.trim()) return allApplicants.slice(0, 15);
    const q = searchQuery.toLowerCase();
    return allApplicants
      .filter(
        (a) =>
          a.fullName?.toLowerCase().includes(q) ||
          a.email?.toLowerCase().includes(q) ||
          a.phoneNumber?.includes(q)
      )
      .slice(0, 15);
  }, [allApplicants, searchQuery]);

  const fetchData = async (silent = false) => {
    if (!silent && interviews.length === 0) setLoading(true);
    setError(null);
    try {
      const [meRes, evalRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/evaluations'),
      ]);

      const meData = await meRes.json();
      if (!meData.authenticated) {
        router.push('/login');
        return;
      }
      setCurrentUser(meData.user);

      const evalData = await evalRes.json();
      if (!evalData.success) throw new Error(evalData.error || 'Failed to load assigned interviews.');
      setInterviews(evalData.interviews || []);
      setClientCached('hr_assigned_interviews', evalData.interviews || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = getClientCached<AssignedInterview[]>('hr_assigned_interviews');
    if (cached && cached.length > 0) {
      setInterviews(cached);
      setLoading(false);
    }
    const isFresh = isClientCacheFresh('hr_assigned_interviews', 15000);
    fetchData(isFresh);

    const onFocus = () => {
      fetchData(true);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const filteredInterviews = useMemo(() => {
    return interviews.filter((item) => {
      if (filter === 'ACTIVE') return item.status === 'SCHEDULED' || item.status === 'IN_PROGRESS';
      if (filter === 'COMPLETED') return item.status === 'COMPLETED';
      return true;
    });
  }, [interviews, filter]);

  const stats = useMemo(() => {
    return {
      total: interviews.length,
      active: interviews.filter((i) => i.status === 'SCHEDULED' || i.status === 'IN_PROGRESS').length,
      completed: interviews.filter((i) => i.status === 'COMPLETED').length,
    };
  }, [interviews]);

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col relative z-10">
      <HRNavbar hrName={currentUser?.name || 'HR Officer'} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Welcome Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-[#023260] to-[#011c38] border border-white/10 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#00a1c0] text-xs font-bold tracking-wider uppercase mb-1">
              <Award size={16} />
              <span>IEEE ECU Student Branch Recruitment</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Welcome, {currentUser?.name || 'HR Officer'}
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              Review and conduct evaluations for your assigned candidates. All criteria and team notes save in real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
            <button
              onClick={openDirectModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00a1c0] to-[#0284c7] hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-[#00a1c0]/20 transition"
              title="Start an on-demand interview session for any applicant without waiting for scheduling or emails"
            >
              <PlusCircle size={15} />
              <span>Direct Interview (Any Candidate)</span>
            </button>

            <button
              onClick={() => fetchData(false)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/10 transition"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-[#00a1c0]' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[#022344]/80 border border-white/10 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Assigned Candidates</div>
              <div className="text-2xl font-black text-white mt-1">{stats.total}</div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center text-slate-300">
              <Users size={22} />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#022344]/80 border border-white/10 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">To Be Conducted</div>
              <div className="text-2xl font-black text-[#00a1c0] mt-1">{stats.active}</div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#00a1c0]/10 flex items-center justify-center text-[#00a1c0]">
              <Clock size={22} />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#022344]/80 border border-white/10 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Evaluations Completed</div>
              <div className="text-2xl font-black text-emerald-400 mt-1">{stats.completed}</div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle size={22} />
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
          <div className="flex items-center gap-2">
            {(['ALL', 'ACTIVE', 'COMPLETED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${
                  filter === tab
                    ? 'bg-[#00a1c0] text-[#02182B] border-[#00a1c0] shadow-md'
                    : 'bg-[#022344]/70 text-slate-400 border-white/10 hover:bg-white/5'
                }`}
              >
                {tab === 'ALL' && `All (${stats.total})`}
                {tab === 'ACTIVE' && `Pending / Active (${stats.active})`}
                {tab === 'COMPLETED' && `Evaluated (${stats.completed})`}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-400">
            Showing <strong className="text-white">{filteredInterviews.length}</strong> assigned candidate{filteredInterviews.length === 1 ? '' : 's'}
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Interviews Grid */}
        {loading && interviews.length === 0 ? (
          <SkeletonCardGrid count={6} />
        ) : filteredInterviews.length === 0 ? (
          <div className="p-12 rounded-3xl bg-[#022344]/50 border border-white/10 text-center space-y-3">
            <User className="mx-auto text-slate-500" size={40} />
            <h3 className="text-base font-bold text-white">No Interviews in this View</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {filter === 'COMPLETED'
                ? 'You have not submitted any completed evaluations yet.'
                : 'No pending interviews currently assigned to your account. Check back once the admin generates the schedule.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredInterviews.map((slot) => {
              const isCompleted = slot.status === 'COMPLETED';
              const isInProgress = slot.status === 'IN_PROGRESS';

              return (
                <div
                  key={slot.id}
                  className={`p-6 rounded-3xl border transition flex flex-col justify-between relative overflow-hidden ${
                    isInProgress
                      ? 'bg-[#022b52] border-[#00a1c0] shadow-lg shadow-[#00a1c0]/10'
                      : isCompleted
                      ? 'bg-[#022344]/60 border-emerald-500/30'
                      : 'bg-[#022344]/80 border-white/10 hover:border-white/25'
                  }`}
                >
                  {/* Top Status Bar */}
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 border ${
                        isInProgress
                          ? 'bg-[#00a1c0]/20 text-[#00a1c0] border-[#00a1c0]/40 animate-pulse'
                          : isCompleted
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {isInProgress && <span className="w-2 h-2 rounded-full bg-[#00a1c0] animate-ping inline-block"></span>}
                      {isCompleted ? 'Evaluated' : isInProgress ? 'In Progress' : 'Scheduled'}
                    </span>

                    <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                      <Clock size={12} />
                      {slot.durationMinutes} min
                    </span>
                  </div>

                  {/* Candidate Identity */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-black text-white leading-tight">
                        {slot.applicantName}
                      </h3>
                      {slot.applicantFaculty && (
                        <span className="px-2 py-0.5 rounded-lg bg-[#00a1c0]/20 border border-[#00a1c0]/40 text-[#00a1c0] text-[11px] font-bold flex items-center gap-1 shrink-0">
                          <GraduationCap size={12} />
                          <span>{slot.applicantFaculty}</span>
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-xs text-slate-300">
                      <div className="flex items-center gap-2 text-slate-400 truncate">
                        <Mail size={13} className="flex-shrink-0 text-[#00a1c0]" />
                        <span className="truncate">{slot.applicantEmail}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Phone size={13} className="flex-shrink-0 text-[#00a1c0]" />
                        <span>{slot.applicantPhone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Applied Teams */}
                  <div className="space-y-1.5 mb-4">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Applied Committees
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {slot.appliedTeams.map((team) => (
                        <span
                          key={team.id}
                          className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold ${
                            team.category === 'TECH'
                              ? 'bg-[#00a1c0]/20 text-[#00a1c0] border border-[#00a1c0]/30'
                              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          }`}
                        >
                          {team.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Head Panel */}
                  <div className="space-y-1 mb-5">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Attending Heads
                    </div>
                    <div className="text-xs text-slate-300 font-medium">
                      {slot.assignedHeads.length > 0 ? slot.assignedHeads.join(', ') : 'Assigned HR Only'}
                    </div>
                  </div>

                  {/* Schedule Slot */}
                  <div className="p-3 rounded-2xl bg-[#011c38] border border-white/5 mb-5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Calendar size={14} className="text-[#00a1c0]" />
                      <span>{slot.date}</span>
                    </div>
                    <div className="font-mono font-bold text-white whitespace-nowrap">
                      {formatTimeTo12h(slot.startTime)} – {formatTimeTo12h(slot.endTime)}
                    </div>
                  </div>

                  {/* Action Link */}
                  <Link
                    href={`/hr/interview/${slot.id}`}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                      isInProgress
                        ? 'bg-[#00a1c0] hover:bg-[#00b5d8] text-[#02182B] shadow-lg shadow-[#00a1c0]/20'
                        : isCompleted
                        ? 'bg-white/10 hover:bg-white/20 text-emerald-300 border border-emerald-500/20'
                        : 'bg-gradient-to-r from-[#023260] to-[#00a1c0] hover:brightness-110 text-white shadow-lg shadow-[#00a1c0]/20'
                    }`}
                  >
                    {isInProgress ? (
                      <>
                        <PlayCircle size={16} />
                        <span>Resume Live Interview</span>
                      </>
                    ) : isCompleted ? (
                      <>
                        <CheckCircle size={16} />
                        <span>Review / Edit Scores</span>
                      </>
                    ) : (
                      <>
                        <span>Start Interview</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* Direct Interview Modal (Launch Any Candidate Immediately) */}
        {showDirectModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#021f3d] border border-white/10 rounded-3xl p-6 max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <PlayCircle className="text-[#00a1c0]" size={20} />
                    Direct Interview (Any Candidate)
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Start evaluating any applicant immediately without an interview schedule or notification email.
                  </p>
                </div>
                <button
                  onClick={() => setShowDirectModal(false)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search Bar */}
              <div className="my-4 relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search applicant by name, email, or phone..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#011428] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#00a1c0]"
                  autoFocus
                />
              </div>

              {/* Candidate List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
                {loadingApplicants ? (
                  <div className="space-y-2 py-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1.5 animate-pulse">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-56" />
                      </div>
                    ))}
                  </div>
                ) : filteredApplicants.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No applicants found matching &quot;{searchQuery}&quot;.
                  </div>
                ) : (
                  filteredApplicants.map((app) => (
                    <div
                      key={app.id}
                      className="p-3.5 rounded-xl bg-[#011c38]/60 border border-white/5 hover:border-[#00a1c0]/40 flex items-center justify-between gap-3 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white truncate">{app.fullName}</span>
                          {(app.faculty || app.college) && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#00a1c0]/20 text-[#00a1c0] border border-[#00a1c0]/40 flex items-center gap-1 shrink-0">
                              <GraduationCap size={10} />
                              <span>{app.faculty || app.college}</span>
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 truncate">{app.email} · {app.phoneNumber}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(app.teams || []).map((t: any) => (
                            <span key={t.id || t.name} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 text-slate-300">
                              {t.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setShowDirectModal(false);
                          router.push(`/hr/interview/${app.id}`);
                        }}
                        className="px-3 py-2 rounded-lg bg-gradient-to-r from-[#023260] to-[#00a1c0] hover:brightness-110 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#00a1c0]/20 flex-shrink-0"
                      >
                        <Play size={13} />
                        <span>Start</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
