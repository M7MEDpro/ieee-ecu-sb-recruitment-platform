'use client';

/**
 * @file applicants/page.tsx
 * @brief Searchable & Filterable Applicant Governance Table with Excel Export.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  Download,
  Eye,
  Check,
  X,
  CheckCircle2,
  Clock,
  UserCheck,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Play,
  Send,
  Loader2,
  Trash2,
  RefreshCw,
  MessageSquare,
  Phone,
  Copy,
  Calendar,
  CalendarPlus,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { ApplicantWithTeams, TEAMS, formatTimeTo12h } from '@ieee-recruitment/shared';
import {
  getClientCached,
  setClientCached,
  invalidateClientCache,
  isClientCacheFresh,
} from '@/lib/clientCache';
import { SkeletonTableRows } from '@/components/Skeletons';

function ApplicantsContent() {
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get('filter') || 'ALL';

  const initialCacheKey = `applicants_${initialFilter}_`;

  const [applicants, setApplicants] = useState<ApplicantWithTeams[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState(initialFilter);
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
  const [selectedApplicantIds, setSelectedApplicantIds] = useState<Set<string>>(new Set());

  // Filter tabs count calculator
  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: applicants.length,
      UNREVIEWED: 0,
      REVIEWED: 0,
      PENDING_WA: 0,
      ACCEPTED: 0,
      WAITLISTED: 0,
      REJECTED: 0,
      NO_SHOW: 0,
      BOTH: 0,
    };
    for (const a of applicants) {
      if (!a.isReviewed) counts.UNREVIEWED++;
      if (a.isReviewed) counts.REVIEWED++;
      if (a.isReviewed && a.decisionWhatsappStatus !== 'SENT') counts.PENDING_WA++;
      if (a.interviewStatus === 'NO_SHOW') counts.NO_SHOW++;
      if (a.teams && a.teams.length >= 2) counts.BOTH++;
      const decs = Object.values(a.decisions || {});
      if (decs.includes('ACCEPTED')) counts.ACCEPTED++;
      if (decs.includes('WAITLISTED')) counts.WAITLISTED++;
      if (decs.includes('REJECTED')) counts.REJECTED++;
    }
    return counts;
  }, [applicants]);

  // Committee / Team applicant counts
  const teamApplicantCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: applicants.length };
    for (const t of TEAMS) {
      counts[t.id] = 0;
    }
    for (const a of applicants) {
      for (const t of a.teams || []) {
        counts[t.id] = (counts[t.id] || 0) + 1;
      }
    }
    return counts;
  }, [applicants]);

  // Multi-select handlers
  const handleToggleSelectOne = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedApplicantIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    if (paginatedApplicants.length > 0 && paginatedApplicants.every((a) => selectedApplicantIds.has(a.id))) {
      setSelectedApplicantIds(new Set());
    } else {
      setSelectedApplicantIds(new Set(paginatedApplicants.map((a) => a.id)));
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    fetchApplicants(activeFilter, '', false);
  };

  // Committee / Team Filtering + Pagination
  const filteredApplicants = useMemo(() => {
    if (!selectedTeam || selectedTeam === 'ALL') return applicants;
    return applicants.filter((a) =>
      (a.teams || []).some((t) => t.id === selectedTeam || t.name.toLowerCase() === selectedTeam.toLowerCase())
    );
  }, [applicants, selectedTeam]);

  // Pagination for handling 1000+ candidates smoothly
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;
  const totalPages = Math.ceil(filteredApplicants.length / pageSize) || 1;
  const paginatedApplicants = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredApplicants.slice(start, start + pageSize);
  }, [filteredApplicants, currentPage]);

  // Reset to page 1 when team filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTeam]);

  const fetchApplicants = async (filter = activeFilter, query = searchQuery, silent = false) => {
    const cacheKey = `applicants_${filter}_${query}`;
    const cached = getClientCached<ApplicantWithTeams[]>(cacheKey);

    if (cached && !silent && applicants.length === 0) {
      setApplicants(cached);
      setLoading(false);
    } else if (!cached && applicants.length === 0) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const url = `/api/applicants?filter=${encodeURIComponent(filter)}&q=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setApplicants(data.applicants);
        setClientCached(cacheKey, data.applicants);
        setCurrentPage(1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const cacheKey = `applicants_${activeFilter}_${searchQuery}`;
    const cached = getClientCached<ApplicantWithTeams[]>(cacheKey);
    if (cached) {
      setApplicants(cached);
      setLoading(false);
    }
    if (!isClientCacheFresh(cacheKey, 10000)) {
      fetchApplicants(activeFilter, searchQuery, Boolean(cached));
    }
  }, [activeFilter]);

  // Window Focus Revalidation
  useEffect(() => {
    const handleFocus = () => {
      fetchApplicants(activeFilter, searchQuery, true);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [activeFilter, searchQuery]);

  // Periodic Background Polling (Every 8s Live Auto-Sync)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchApplicants(activeFilter, searchQuery, true);
    }, 8000);
    return () => clearInterval(interval);
  }, [activeFilter, searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchApplicants(activeFilter, searchQuery, false);
  };

  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleDeleteApplicant = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to permanently delete applicant "${name}"? This action cannot be undone.`)) {
      return;
    }

    // 0ms Optimistic UI update
    setApplicants((prev) => prev.filter((a) => a.id !== id));
    invalidateClientCache('applicants');
    invalidateClientCache('admin_dashboard_stats');
    setActionMessage(null);
    setActionError(null);

    try {
      const res = await fetch(`/api/applicants/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete applicant.');
      }
      setActionMessage(`Applicant "${name}" deleted permanently.`);
    } catch (err: any) {
      setActionError(err.message);
      fetchApplicants(activeFilter, searchQuery, false);
    }
  };

  // Bulk Operations Handlers
  const handleBulkMarkReviewed = async () => {
    const selectedApps = applicants.filter((a) => selectedApplicantIds.has(a.id));
    if (selectedApps.length === 0) return;

    const invalidApps = selectedApps.filter((app) => {
      const unDecided = (app.teams || []).filter((t) => {
        const dec = app.decisions?.[t.id];
        return !dec || dec === 'PENDING';
      });
      return unDecided.length > 0;
    });

    if (invalidApps.length > 0) {
      alert(`Cannot mark all selected as reviewed: ${invalidApps.length} candidate(s) still have committees with pending decisions. Please set decisions first.`);
      return;
    }

    if (!confirm(`Mark ${selectedApps.length} candidate(s) as reviewed?`)) return;

    setApplicants((prev) =>
      prev.map((a) => (selectedApplicantIds.has(a.id) ? { ...a, isReviewed: true } : a))
    );
    setSelectedApplicantIds(new Set());
    invalidateClientCache('applicants');
    invalidateClientCache('admin_dashboard_stats');

    await Promise.all(
      selectedApps.map((a) => fetch(`/api/applicants/${a.id}/review`, { method: 'POST' }).catch(() => {}))
    );
    setActionMessage(`${selectedApps.length} candidate(s) marked as reviewed.`);
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleStartSelectedDecisionQueue = () => {
    const selected = applicants.filter((a) => selectedApplicantIds.has(a.id) && a.isReviewed);
    if (selected.length === 0) {
      alert('None of the selected candidates are marked as reviewed with decisions. Please make sure candidates are reviewed before queuing decisions.');
      return;
    }
    setQueueIndex(0);
    setIsQueueOpen(true);
    loadQueueMessage(selected[0]);
  };

  const handleBulkDelete = async () => {
    const count = selectedApplicantIds.size;
    if (!confirm(`⚠️ DANGER: Are you sure you want to permanently delete ${count} selected applicant(s)? This action cannot be undone.`)) {
      return;
    }
    const ids = Array.from(selectedApplicantIds);
    setApplicants((prev) => prev.filter((a) => !selectedApplicantIds.has(a.id)));
    setSelectedApplicantIds(new Set());
    invalidateClientCache('applicants');
    invalidateClientCache('admin_dashboard_stats');
    await Promise.all(ids.map((id) => fetch(`/api/applicants/${id}`, { method: 'DELETE' }).catch(() => {})));
    setActionMessage(`${count} applicant(s) deleted permanently.`);
    setTimeout(() => setActionMessage(null), 4000);
  };

  const router = useRouter();

  // Quick WhatsApp Dispatch Modal State
  const [quickWAModal, setQuickWAModal] = useState<{
    isOpen: boolean;
    loading: boolean;
    applicant: ApplicantWithTeams | null;
    message: string;
    phone: string;
    waUrl: string | null;
    copied: boolean;
  }>({
    isOpen: false,
    loading: false,
    applicant: null,
    message: '',
    phone: '',
    waUrl: null,
    copied: false,
  });

  const handleOpenQuickWhatsApp = async (app: ApplicantWithTeams, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setQuickWAModal({
      isOpen: true,
      loading: true,
      applicant: app,
      message: '',
      phone: '',
      waUrl: null,
      copied: false,
    });

    try {
      const res = await fetch('/api/whatsapp/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicantId: app.id }),
      });
      const data = await res.json();
      if (data.success) {
        setQuickWAModal((prev) => ({
          ...prev,
          loading: false,
          message: data.message || '',
          phone: data.phone || '',
          waUrl: data.waUrl || null,
        }));
      } else {
        alert(data.error || 'Failed to generate WhatsApp decision message.');
        setQuickWAModal((prev) => ({ ...prev, isOpen: false, loading: false }));
      }
    } catch (err: any) {
      alert(err.message || 'Error generating WhatsApp message.');
      setQuickWAModal((prev) => ({ ...prev, isOpen: false, loading: false }));
    }
  };

  const handleCopyQuickWAMessage = async () => {
    if (!quickWAModal.message) return;
    try {
      await navigator.clipboard.writeText(quickWAModal.message);
      setQuickWAModal((prev) => ({ ...prev, copied: true }));
      setTimeout(() => setQuickWAModal((prev) => ({ ...prev, copied: false })), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkDecisionWhatsappSent = async (applicantId: string) => {
    try {
      await fetch('/api/whatsapp/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicantId, action: 'MARK_SENT', status: 'SENT' }),
      });
      setApplicants((prev) =>
        prev.map((a) =>
          a.id === applicantId
            ? {
                ...a,
                decisionWhatsappStatus: 'SENT',
                decisionWhatsappSentAt: new Date().toISOString(),
              }
            : a
        )
      );
      invalidateClientCache('applicants');
    } catch (e) {
      console.error(e);
    }
  };

  // Quotas State & Loader
  const [quotas, setQuotas] = useState<any[]>([]);
  const [showQuotasBar, setShowQuotasBar] = useState(false);

  useEffect(() => {
    fetch('/api/quotas')
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d.quotas)) setQuotas(d.quotas);
      })
      .catch(() => {});
  }, []);

  // Decision Dispatch Queue State & Handlers
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [queueIndex, setQueueIndex] = useState(0);
  const [queueMsg, setQueueMsg] = useState('');
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueCopied, setQueueCopied] = useState(false);

  const pendingQueueApplicants = useMemo(() => {
    return applicants.filter((a) => a.isReviewed && a.decisionWhatsappStatus !== 'SENT');
  }, [applicants]);

  const currentQueueApplicant = pendingQueueApplicants[queueIndex] || null;

  const loadQueueMessage = async (app: ApplicantWithTeams) => {
    setQueueLoading(true);
    try {
      const res = await fetch('/api/whatsapp/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicantId: app.id }),
      });
      const data = await res.json();
      if (data.success) {
        setQueueMsg(data.message || '');
      } else {
        setQueueMsg('');
      }
    } catch (e) {
      setQueueMsg('');
    } finally {
      setQueueLoading(false);
    }
  };

  const handleStartDecisionQueue = () => {
    if (pendingQueueApplicants.length === 0) return;
    setQueueIndex(0);
    setIsQueueOpen(true);
    loadQueueMessage(pendingQueueApplicants[0]);
  };

  const handleQueueNext = () => {
    if (queueIndex < pendingQueueApplicants.length - 1) {
      const nextIdx = queueIndex + 1;
      setQueueIndex(nextIdx);
      loadQueueMessage(pendingQueueApplicants[nextIdx]);
    } else {
      setIsQueueOpen(false);
      setActionMessage('All queued decisions have been dispatched!');
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleCopyQueueMessage = async () => {
    if (!queueMsg) return;
    try {
      await navigator.clipboard.writeText(queueMsg);
      setQueueCopied(true);
      setTimeout(() => setQueueCopied(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleQueueOpenAndNext = async () => {
    if (!currentQueueApplicant) return;
    const phone = currentQueueApplicant.phoneNumber || (currentQueueApplicant as any).phone;
    let clean = (phone || '').replace(/\D/g, '');
    if (clean.startsWith('01')) clean = '2' + clean;
    else if (clean.startsWith('1') && clean.length === 10) clean = '20' + clean;
    else if (!clean.startsWith('20') && clean.length === 11 && clean.startsWith('0')) clean = '2' + clean;

    const waUrl = clean
      ? `https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(queueMsg)}`
      : null;

    if (waUrl) {
      window.open(waUrl, '_blank');
    }

    await handleMarkDecisionWhatsappSent(currentQueueApplicant.id);
    handleQueueNext();
  };

  const handleToggleReviewed = async (app: ApplicantWithTeams, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!app.isReviewed) {
      // Validate that all applied committees have an explicit decision (not PENDING)
      const unDecidedTeams = (app.teams || []).filter((t) => {
        const dec = app.decisions?.[t.id];
        return !dec || dec === 'PENDING';
      });

      if (unDecidedTeams.length > 0) {
        alert(
          `Please review candidate and choose Accept or Reject for all applied committees before marking as reviewed:\n- ${unDecidedTeams.map((t) => t.name).join('\n- ')}`
        );
        router.push(`/admin/applicants/${app.id}`);
        return;
      }
    }

    // Instant optimistic update for 0ms loading lag
    setApplicants((prev) =>
      prev.map((a) =>
        a.id === app.id ? { ...a, isReviewed: !a.isReviewed } : a
      )
    );
    invalidateClientCache('admin_dashboard_stats');
    invalidateClientCache('applicants');

    try {
      const res = await fetch(`/api/applicants/${app.id}/review`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!data.success) {
        // Revert on failure
        setApplicants((prev) =>
          prev.map((a) =>
            a.id === app.id ? { ...a, isReviewed: !a.isReviewed } : a
          )
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="text-xs font-bold text-[#00a1c0] tracking-widest uppercase">
            Candidate Directory
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Applicant Submissions
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Search, filter, assess averages, and manage committee decisions.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Auto-Sync (8s)</span>
          </div>

          {pendingQueueApplicants.length > 0 && (
            <button
              type="button"
              onClick={handleStartDecisionQueue}
              className="col-span-2 sm:col-span-1 justify-center px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 text-xs font-black transition flex items-center gap-2 shadow-lg shadow-[#25D366]/20 animate-pulse"
            >
              <Send size={14} className="fill-slate-950" />
              <span>Decision Queue ({pendingQueueApplicants.length} Pending)</span>
            </button>
          )}

          <Link
            href="/admin/whatsapp"
            className="justify-center px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 text-xs font-bold transition flex items-center gap-2 shadow-sm hover:border-emerald-500/50"
          >
            <MessageSquare size={15} className="text-emerald-400" />
            <span>WhatsApp Studio</span>
          </Link>

          <a
            href="/api/export/excel"
            download
            className="col-span-2 sm:col-span-1 justify-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#023260] to-[#00a1c0] hover:brightness-110 border border-[#00a1c0]/40 text-xs font-bold text-white transition flex items-center gap-2 shadow-lg shadow-[#00a1c0]/20"
          >
            <Download size={15} />
            Export to Excel (.xlsx)
          </a>
        </div>
      </div>

      {/* Real-time Committee Target Capacities Collapsible Bar */}
      {showQuotasBar && quotas.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/10 space-y-3 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <Filter size={14} className="text-[#00a1c0]" />
              <span>Real-Time Committee Target Capacities</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Live accepted count vs target quotas
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {quotas.map((q) => {
              const isFull = q.acceptedCount >= q.targetQuota;
              return (
                <div
                  key={q.teamId}
                  className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white truncate max-w-[120px]">{q.teamName}</span>
                    <span
                      className={`font-mono font-bold text-[11px] ${
                        isFull ? 'text-amber-400' : 'text-[#00a1c0]'
                      }`}
                    >
                      {q.acceptedCount}/{q.targetQuota}
                    </span>
                  </div>

                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        isFull ? 'bg-amber-400' : 'bg-[#00a1c0]'
                      }`}
                      style={{ width: `${Math.min(q.percentFilled, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{q.percentFilled}% filled</span>
                    <span className="text-amber-400/90">WL: {q.waitlistedCount}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notifications */}
      {actionMessage && (
        <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-xl p-4 text-emerald-200 text-xs flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {actionError && (
        <div className="bg-rose-950/80 border border-rose-500/40 rounded-xl p-4 text-rose-200 text-xs flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle size={18} className="text-rose-400 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, email, phone, or National ID..."
            className="w-full bg-black/40 border border-white/15 focus:border-[#00a1c0] focus:ring-1 focus:ring-[#00a1c0] rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition"
          />
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition"
              title="Clear search query"
            >
              <X size={14} />
            </button>
          )}
        </form>

        {/* Filter Tabs with Numerical Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full md:w-auto pb-1">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'UNREVIEWED', label: 'Unreviewed' },
            { id: 'REVIEWED', label: 'Reviewed' },
            { id: 'PENDING_WA', label: 'Pending WA Decision' },
            { id: 'ACCEPTED', label: 'Accepted' },
            { id: 'WAITLISTED', label: 'Waitlisted' },
            { id: 'REJECTED', label: 'Rejected' },
            { id: 'NO_SHOW', label: 'Absent' },
            { id: 'BOTH', label: 'Dual Track' },
          ].map((tab) => {
            const count = filterCounts[tab.id] ?? 0;
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#00a1c0] text-white shadow-sm font-bold'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-extrabold ${
                    isActive ? 'bg-black/30 text-white' : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Committee / Team Specific Filters */}
      <div className="flex flex-wrap items-center gap-1.5 pb-2 pt-2 border-t border-white/5">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 py-1 px-1 shrink-0 mr-1">
          <Layers size={13} className="text-[#00a1c0]" />
          <span>Committees:</span>
        </div>

        <button
          type="button"
          onClick={() => setSelectedTeam('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
            selectedTeam === 'ALL'
              ? 'bg-[#00a1c0] text-white shadow-md font-bold'
              : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/5'
          }`}
        >
          <span>All Committees</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${selectedTeam === 'ALL' ? 'bg-black/30 text-white' : 'bg-white/10 text-slate-400'}`}>
            {teamApplicantCounts.ALL ?? 0}
          </span>
        </button>

        {TEAMS.map((team) => {
          const isSelected = selectedTeam === team.id;
          const count = teamApplicantCounts[team.id] ?? 0;
          return (
            <button
              key={team.id}
              type="button"
              onClick={() => setSelectedTeam(isSelected ? 'ALL' : team.id)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 border ${
                isSelected
                  ? 'bg-white/20 text-white border-white/40 shadow-sm'
                  : 'bg-white/[0.04] text-slate-300 hover:bg-white/10 hover:text-white border-white/5'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: team.color }}
              />
              <span>{team.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-extrabold ${
                  isSelected ? 'bg-black/30 text-white' : 'bg-white/10 text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table & Mobile Cards Container */}
      <div className="admin-card rounded-2xl overflow-hidden shadow-xl">
        {/* Mobile Card List View (Visible on < md) */}
        <div className="md:hidden divide-y divide-white/5">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : applicants.length === 0 ? (
            <div className="py-12 px-4 text-center text-slate-400 text-xs">
              No applicants found matching this criteria.
            </div>
          ) : (
            paginatedApplicants.map((app) => (
              <div key={app.id} className="p-4 space-y-3 hover:bg-white/[0.02] transition">
                {/* Top Row: Candidate Name & Interview Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedApplicantIds.has(app.id)}
                      onChange={(e) => handleToggleSelectOne(app.id, e as any)}
                      className="rounded border-white/20 bg-black/40 text-[#00a1c0] focus:ring-[#00a1c0] cursor-pointer h-4 w-4 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/applicants/${app.id}`}
                        className="font-bold text-white text-sm hover:text-[#00a1c0] transition block truncate"
                      >
                        {app.fullName}
                      </Link>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        ID: {app.nationalId}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                      app.interviewStatus === 'COMPLETED'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : app.interviewStatus === 'SCHEDULED'
                        ? 'bg-[#00a1c0]/20 text-[#00a1c0]'
                        : app.interviewStatus === 'NO_SHOW'
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    {app.interviewStatus}
                  </span>
                </div>

                {/* Contact Info: Phone link & Email */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <a
                    href={`tel:${app.phoneNumber}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-bold text-xs hover:bg-emerald-500/25 transition shadow-sm"
                  >
                    <Phone size={11} className="text-emerald-400" />
                    <span>{app.phoneNumber}</span>
                  </a>
                  {app.email && (
                    <span className="text-[11px] text-slate-400 font-mono truncate max-w-[200px]">
                      {app.email}
                    </span>
                  )}
                </div>

                {/* Applied Committees */}
                <div className="flex flex-wrap gap-1.5">
                  {app.teams.map((t) => {
                    const dec = app.decisions?.[t.id] || 'PENDING';
                    const isAcc = dec === 'ACCEPTED';
                    const isWait = dec === 'WAITLISTED';
                    const isRej = dec === 'REJECTED';

                    return (
                      <span
                        key={t.id}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          isAcc
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : isWait
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : isRej
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-white/5 text-slate-300 border-white/10'
                        }`}
                      >
                        {t.name}
                        {isAcc && <Check size={10} className="inline ml-1 text-emerald-400" />}
                        {isWait && <Clock size={10} className="inline ml-1 text-amber-400" />}
                        {isRej && <X size={10} className="inline ml-1 text-rose-400" />}
                      </span>
                    );
                  })}
                </div>

                {/* Schedule Status & Action Banner */}
                {app.interviewSchedule ? (
                  <div className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-blue-500/10 border border-blue-500/25">
                    <div className="flex items-center gap-1.5 text-blue-300 font-semibold truncate">
                      <Calendar size={13} className="text-blue-400 shrink-0" />
                      <span className="truncate">
                        {app.interviewSchedule.date} • {formatTimeTo12h(app.interviewSchedule.startTime)} – {formatTimeTo12h(app.interviewSchedule.endTime)}
                      </span>
                    </div>
                    <Link
                      href={`/admin/scheduling?search=${encodeURIComponent(app.fullName)}&slotId=${app.interviewSchedule.id}`}
                      className="shrink-0 px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 text-[11px] font-bold flex items-center gap-1 transition shadow-sm"
                      title="View schedule details in timeline"
                    >
                      <span>View Schedule</span>
                      <ExternalLink size={10} />
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
                    <span className="text-amber-300/80 font-medium text-[11px]">No interview scheduled</span>
                    <Link
                      href={`/admin/scheduling?applicantId=${app.id}&name=${encodeURIComponent(app.fullName)}`}
                      className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1 transition shadow-sm"
                      title="Jump to Scheduling and create slot"
                    >
                      <CalendarPlus size={12} className="text-amber-400" />
                      <span>Schedule Interview</span>
                      <ArrowRight size={10} className="text-amber-400" />
                    </Link>
                  </div>
                )}

                {/* Score Averages Grid */}
                <div className="grid grid-cols-3 gap-2 bg-black/30 p-2.5 rounded-xl border border-white/5 text-center">
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Gen Avg</div>
                    <div className="text-xs font-black text-white mt-0.5">
                      {app.generalAverage !== null && app.generalAverage !== undefined ? app.generalAverage : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-[#00a1c0] font-bold">Tech Avg</div>
                    <div className="text-xs font-black text-[#00a1c0] mt-0.5">
                      {app.techAverage !== null && app.techAverage !== undefined ? app.techAverage : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-purple-400 font-bold">Non-Tech</div>
                    <div className="text-xs font-black text-purple-400 mt-0.5">
                      {app.nonTechAverage !== null && app.nonTechAverage !== undefined ? app.nonTechAverage : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Bottom Bar: Reviewed Status & Actions (Mobile Optimized 2-Row Layout) */}
                <div className="pt-2 border-t border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={(e) => handleToggleReviewed(app, e)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border flex items-center gap-1.5 ${
                        app.isReviewed
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <Check size={13} className={app.isReviewed ? 'text-emerald-400' : 'text-slate-500'} />
                      <span>{app.isReviewed ? 'Reviewed' : 'Mark Reviewed'}</span>
                    </button>

                    {app.decisionWhatsappStatus === 'SENT' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                        <Check size={10} className="text-emerald-400" />
                        <span>WA Sent</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {app.isReviewed ? (
                      <>
                        <button
                          onClick={(e) => handleOpenQuickWhatsApp(app, e)}
                          title="Send WhatsApp Decision Message"
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 text-xs font-extrabold transition shadow-sm active:scale-95"
                        >
                          <MessageSquare size={14} className="fill-slate-950" />
                          <span>{app.decisionWhatsappStatus === 'SENT' ? 'Re-send WhatsApp' : 'Send WhatsApp'}</span>
                        </button>
                        <Link
                          href={`/admin/applicants/${app.id}`}
                          className="inline-flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-[#00a1c0] hover:text-white text-slate-300 text-xs font-semibold transition shrink-0"
                        >
                          <span>Profile</span>
                          <ChevronRight size={14} />
                        </Link>
                      </>
                    ) : app.interviewStatus === 'COMPLETED' || app.evaluationStatus === 'COMPLETED' ? (
                      <Link
                        href={`/admin/applicants/${app.id}`}
                        title="Review interview scores & set decisions"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#00a1c0] to-[#023260] hover:brightness-110 text-white border border-[#00a1c0]/40 text-xs font-bold transition shadow-sm"
                      >
                        <Eye size={14} />
                        <span>Review Profile</span>
                        <ChevronRight size={14} />
                      </Link>
                    ) : (
                      <>
                        <Link
                          href={`/hr/interview/${app.id}`}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition shadow-sm"
                        >
                          <Play size={12} fill="currentColor" />
                          <span>Interview</span>
                        </Link>
                        <Link
                          href={`/admin/applicants/${app.id}`}
                          className="inline-flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-[#00a1c0] hover:text-white text-slate-300 text-xs font-semibold transition shrink-0"
                        >
                          <span>Profile</span>
                          <ChevronRight size={14} />
                        </Link>
                      </>
                    )}

                    <button
                      onClick={(e) => handleDeleteApplicant(app.id, app.fullName, e)}
                      title="Delete Applicant Record Permanently"
                      className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table (Hidden on < md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#011c38] text-slate-300 uppercase tracking-wider text-[11px] border-b border-white/10">
              <tr>
                <th className="py-3.5 px-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={paginatedApplicants.length > 0 && paginatedApplicants.every((a) => selectedApplicantIds.has(a.id))}
                    onChange={handleSelectAllVisible}
                    className="rounded border-white/20 bg-black/40 text-[#00a1c0] focus:ring-[#00a1c0] focus:ring-offset-0 cursor-pointer h-4 w-4"
                    title="Select / Deselect all visible"
                  />
                </th>
                <th className="py-3.5 px-4">Applicant</th>
                <th className="py-3.5 px-4">Applied Committees</th>
                <th className="py-3.5 px-4">Schedule / Status</th>
                <th className="py-3.5 px-3 text-center">Gen Avg</th>
                <th className="py-3.5 px-3 text-center">Tech Avg</th>
                <th className="py-3.5 px-3 text-center">Non-Tech Avg</th>
                <th className="py-3.5 px-4 text-center">Review</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {loading ? (
                <SkeletonTableRows rows={6} />
              ) : applicants.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No applicants found matching this criteria.
                  </td>
                </tr>
              ) : (
                paginatedApplicants.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-white/[0.03] transition-colors group"
                  >
                    {/* Checkbox */}
                    <td className="py-3.5 px-3 text-center w-10">
                      <input
                        type="checkbox"
                        checked={selectedApplicantIds.has(app.id)}
                        onChange={(e) => handleToggleSelectOne(app.id, e as any)}
                        className="rounded border-white/20 bg-black/40 text-[#00a1c0] focus:ring-[#00a1c0] cursor-pointer h-4 w-4"
                      />
                    </td>

                    {/* Name & Contact */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white group-hover:text-[#00a1c0] transition-colors">
                        {app.fullName}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {app.phoneNumber}{app.email ? ` • ${app.email}` : ''}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        ID: {app.nationalId}
                      </div>
                    </td>

                    {/* Applied Committees */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {app.teams.map((t) => {
                          const dec = app.decisions?.[t.id] || 'PENDING';
                          const isAcc = dec === 'ACCEPTED';
                          const isWait = dec === 'WAITLISTED';
                          const isRej = dec === 'REJECTED';

                          return (
                            <span
                              key={t.id}
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                isAcc
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : isWait
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : isRej
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                  : 'bg-white/5 text-slate-300 border-white/10'
                              }`}
                            >
                              {t.name}
                              {isAcc && <Check size={10} className="inline ml-1 text-emerald-400" />}
                              {isWait && <Clock size={10} className="inline ml-1 text-amber-400" />}
                              {isRej && <X size={10} className="inline ml-1 text-rose-400" />}
                            </span>
                          );
                        })}
                      </div>
                    </td>

                    {/* Interview Schedule / Status */}
                    <td className="py-3.5 px-4 min-w-[175px]">
                      {app.interviewSchedule ? (
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              app.interviewStatus === 'COMPLETED'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : app.interviewStatus === 'SCHEDULED'
                                ? 'bg-[#00a1c0]/20 text-[#00a1c0] border border-[#00a1c0]/30'
                                : app.interviewStatus === 'NO_SHOW'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-white/5 text-slate-400 border border-white/10'
                            }`}
                          >
                            {app.interviewStatus}
                          </span>

                          <Link
                            href={`/admin/scheduling?search=${encodeURIComponent(app.fullName)}&slotId=${app.interviewSchedule.id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-[11px] font-bold transition shadow-sm group/sch"
                            title="View interview schedule in Timeline"
                          >
                            <Calendar size={11} className="text-blue-400 group-hover/sch:scale-110 transition-transform" />
                            <span>View Schedule</span>
                            <span className="text-[10px] text-blue-400/80 font-mono">
                              ({app.interviewSchedule.date?.slice(5)} • {formatTimeTo12h(app.interviewSchedule.startTime)})
                            </span>
                            <ExternalLink size={10} className="text-blue-400/80" />
                          </Link>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 text-slate-400 border border-white/10">
                            UNSCHEDULED
                          </span>
                          <Link
                            href={`/admin/scheduling?applicantId=${app.id}&name=${encodeURIComponent(app.fullName)}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-bold transition shadow-sm hover:scale-105 active:scale-95"
                            title="Jump to Scheduling and create slot for this candidate"
                          >
                            <CalendarPlus size={12} className="text-amber-400" />
                            <span>+ Schedule</span>
                            <ArrowRight size={10} className="text-amber-400" />
                          </Link>
                        </div>
                      )}
                    </td>

                    {/* General Avg */}
                    <td className="py-3.5 px-3 text-center font-bold text-white">
                      {app.generalAverage !== null && app.generalAverage !== undefined
                        ? app.generalAverage
                        : '—'}
                    </td>

                    {/* Tech Avg */}
                    <td className="py-3.5 px-3 text-center font-bold">
                      {app.techAverage !== null && app.techAverage !== undefined ? (
                        <span className="text-[#00a1c0]">{app.techAverage}</span>
                      ) : (
                        <span className="text-slate-500">N/A</span>
                      )}
                    </td>

                    {/* Non-Tech Avg */}
                    <td className="py-3.5 px-3 text-center font-bold">
                      {app.nonTechAverage !== null && app.nonTechAverage !== undefined ? (
                        <span className="text-purple-400">{app.nonTechAverage}</span>
                      ) : (
                        <span className="text-slate-500">N/A</span>
                      )}
                    </td>

                    {/* Reviewed Status Toggle */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={(e) => handleToggleReviewed(app, e)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border ${
                          app.isReviewed
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span>{app.isReviewed ? 'Reviewed' : 'Mark Reviewed'}</span>
                        {app.isReviewed && <Check size={11} className="text-emerald-400" />}
                      </button>
                    </td>

                    {/* Detail, Review & Action Column */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {app.isReviewed ? (
                          <>
                            {app.decisionWhatsappStatus === 'SENT' ? (
                              <button
                                onClick={(e) => handleOpenQuickWhatsApp(app, e)}
                                title={`Decision WhatsApp sent on ${app.decisionWhatsappSentAt ? new Date(app.decisionWhatsappSentAt).toLocaleDateString() : ''}. Click to inspect or re-send.`}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition shadow-sm"
                              >
                                <Check size={12} className="text-emerald-400" />
                                <span>WA Sent</span>
                              </button>
                            ) : (
                              <button
                                onClick={(e) => handleOpenQuickWhatsApp(app, e)}
                                title="Send WhatsApp Decision Message"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-extrabold text-xs transition shadow-md shadow-[#25D366]/20 active:scale-95"
                              >
                                <MessageSquare size={13} className="fill-slate-950" />
                                <span>Send Message</span>
                              </button>
                            )}

                            <Link
                              href={`/admin/applicants/${app.id}`}
                              title="View Full Candidate Profile"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-[#00a1c0] hover:text-white text-slate-300 text-xs font-semibold transition"
                            >
                              <span>Profile</span>
                              <ChevronRight size={13} />
                            </Link>
                          </>
                        ) : app.interviewStatus === 'COMPLETED' || app.evaluationStatus === 'COMPLETED' ? (
                          <Link
                            href={`/admin/applicants/${app.id}`}
                            title="Review evaluation scores & set committee decisions"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#00a1c0] to-[#023260] hover:brightness-110 text-white border border-[#00a1c0]/40 text-xs font-bold transition shadow-md shadow-[#00a1c0]/20"
                          >
                            <Eye size={13} />
                            <span>Review Profile</span>
                            <ChevronRight size={13} />
                          </Link>
                        ) : (
                          <>
                            <Link
                              href={`/hr/interview/${app.id}`}
                              title="Start live interview session immediately"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition shadow-sm"
                            >
                              <Play size={11} fill="currentColor" />
                              <span>Interview</span>
                            </Link>

                            <Link
                              href={`/admin/applicants/${app.id}`}
                              title="View Full Candidate Profile"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-[#00a1c0] hover:text-white text-slate-300 text-xs font-semibold transition"
                            >
                              <span>Profile</span>
                              <ChevronRight size={13} />
                            </Link>
                          </>
                        )}

                        <button
                          onClick={(e) => handleDeleteApplicant(app.id, app.fullName, e)}
                          title="Delete Applicant Record Permanently"
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 bg-black/20">
            <div>
              Showing{' '}
              <strong className="text-white">
                {(currentPage - 1) * pageSize + 1} -{' '}
                {Math.min(currentPage * pageSize, applicants.length)}
              </strong>{' '}
              of <strong className="text-white">{applicants.length}</strong> candidates
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:hover:bg-white/5 transition flex items-center gap-1 font-semibold"
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>

              <span className="px-2 font-mono text-slate-300">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:hover:bg-white/5 transition flex items-center gap-1 font-semibold"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bulk Actions Toolbar */}
      {selectedApplicantIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#0a192f]/95 border border-[#00a1c0]/50 backdrop-blur-md rounded-2xl px-4 py-3 shadow-2xl shadow-black/80 flex flex-wrap items-center gap-3 animate-in slide-in-from-bottom-5 max-w-[95vw]">
          <div className="flex items-center gap-2 pr-2 border-r border-white/10 text-xs text-white font-bold">
            <span className="w-6 h-6 rounded-full bg-[#00a1c0] text-white flex items-center justify-center text-xs font-mono font-extrabold">
              {selectedApplicantIds.size}
            </span>
            <span className="hidden sm:inline">Selected</span>
          </div>

          <button
            onClick={handleBulkMarkReviewed}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition active:scale-95"
            title="Mark all selected candidates as reviewed"
          >
            <Check size={13} className="text-emerald-400" />
            <span>Mark Reviewed</span>
          </button>

          <button
            onClick={handleStartSelectedDecisionQueue}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 text-xs font-extrabold transition shadow-md shadow-[#25D366]/20 active:scale-95"
            title="Start rapid WhatsApp queue for reviewed candidates"
          >
            <MessageSquare size={13} className="fill-slate-950" />
            <span>Queue WA ({applicants.filter((a) => selectedApplicantIds.has(a.id) && a.isReviewed).length})</span>
          </button>

          <button
            onClick={handleBulkDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition active:scale-95"
            title="Permanently delete selected candidate records"
          >
            <Trash2 size={13} className="text-rose-400" />
            <span className="hidden sm:inline">Delete</span>
          </button>

          <button
            onClick={() => setSelectedApplicantIds(new Set())}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition ml-auto"
            title="Deselect All"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Quick WhatsApp Decision Dispatch Modal */}
      {quickWAModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[#0b141a] border border-slate-700/80 rounded-2xl sm:rounded-3xl max-w-xl w-full p-4 sm:p-6 space-y-4 shadow-2xl shadow-black/80 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#25D366]/20 border border-[#25D366]/30 flex items-center justify-center shrink-0">
                  <MessageSquare size={20} className="text-[#25D366]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-white text-base truncate">
                    WhatsApp Decision Dispatch
                  </h3>
                  <p className="text-xs text-slate-400 truncate">
                    {quickWAModal.applicant?.fullName} • {quickWAModal.applicant?.phoneNumber}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setQuickWAModal((p) => ({ ...p, isOpen: false }))}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content / Loading */}
            {quickWAModal.loading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400">
                <Loader2 size={24} className="animate-spin text-[#25D366]" />
                <span className="text-xs text-center">Generating combined decision message & group links...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Applied Committees Decision Summary */}
                <div className="flex flex-wrap items-center gap-1.5 bg-black/30 p-2.5 rounded-xl border border-white/5">
                  <span className="text-[11px] text-slate-400 font-semibold mr-1">Decisions:</span>
                  {quickWAModal.applicant?.teams?.map((t) => {
                    const dec = quickWAModal.applicant?.decisions?.[t.id] || 'PENDING';
                    const isAcc = dec === 'ACCEPTED';
                    const isWait = dec === 'WAITLISTED';
                    return (
                      <span
                        key={t.id}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isAcc
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : isWait
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        }`}
                      >
                        {t.name}: {dec}
                      </span>
                    );
                  })}
                </div>

                {/* Editable Message Textarea */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Message content:</span>
                    <span className="font-mono">{quickWAModal.message.length} chars</span>
                  </div>
                  <textarea
                    value={quickWAModal.message}
                    onChange={(e) =>
                      setQuickWAModal((p) => ({
                        ...p,
                        message: e.target.value,
                        waUrl: p.phone
                          ? `https://api.whatsapp.com/send?phone=${p.phone}&text=${encodeURIComponent(e.target.value)}`
                          : null,
                      }))
                    }
                    rows={7}
                    dir="rtl"
                    className="w-full bg-black/50 border border-white/15 focus:border-[#25D366] rounded-xl sm:rounded-2xl p-3 sm:p-3.5 text-xs text-white outline-none leading-relaxed font-sans"
                  />
                </div>

                {/* Modal Footer Actions (Mobile Responsive) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={handleCopyQuickWAMessage}
                    className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    {quickWAModal.copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{quickWAModal.copied ? 'Copied' : 'Copy Message'}</span>
                  </button>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setQuickWAModal((p) => ({ ...p, isOpen: false }))}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition text-center"
                    >
                      Close
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        if (quickWAModal.applicant) {
                          await handleMarkDecisionWhatsappSent(quickWAModal.applicant.id);
                        }
                        setQuickWAModal((p) => ({ ...p, isOpen: false }));
                      }}
                      className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition text-center"
                      title="Mark as sent without opening WhatsApp tab"
                    >
                      Mark Sent
                    </button>

                    {quickWAModal.waUrl ? (
                      <a
                        href={quickWAModal.waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          if (quickWAModal.applicant) {
                            handleMarkDecisionWhatsappSent(quickWAModal.applicant.id);
                          }
                          setQuickWAModal((p) => ({ ...p, isOpen: false }));
                        }}
                        className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-lg shadow-[#25D366]/20 transition active:scale-95"
                      >
                        <MessageSquare size={14} className="fill-slate-950" />
                        <span>Open WhatsApp</span>
                        <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="text-xs text-rose-400">Invalid phone number</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sequential Decision Dispatch Queue Modal */}
      {isQueueOpen && currentQueueApplicant && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[#0b141a] border border-[#25D366]/40 rounded-2xl sm:rounded-3xl max-w-xl w-full p-4 sm:p-6 space-y-4 shadow-2xl shadow-black/90 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#25D366]/20 border border-[#25D366]/40 flex items-center justify-center shrink-0 animate-pulse">
                  <Send size={18} className="text-[#25D366]" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    Decision Dispatch Queue
                  </h3>
                  <p className="text-xs text-emerald-400 font-semibold">
                    Candidate {queueIndex + 1} of {pendingQueueApplicants.length} pending
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsQueueOpen(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-[#25D366] h-full transition-all duration-300"
                style={{
                  width: `${((queueIndex + 1) / pendingQueueApplicants.length) * 100}%`,
                }}
              />
            </div>

            {/* Candidate Card */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-bold text-sm">
                    {currentQueueApplicant.fullName}
                  </div>
                  <div className="text-slate-400 font-mono text-xs">
                    {currentQueueApplicant.phoneNumber}{currentQueueApplicant.email ? ` • ${currentQueueApplicant.email}` : ''}
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  Reviewed
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {currentQueueApplicant.teams.map((t) => {
                  const dec = currentQueueApplicant.decisions?.[t.id] || 'PENDING';
                  const isAcc = dec === 'ACCEPTED';
                  const isWait = dec === 'WAITLISTED';
                  return (
                    <span
                      key={t.id}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isAcc
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : isWait
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      }`}
                    >
                      {t.name}: {dec}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Message preview & edit */}
            {queueLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs">
                <Loader2 size={20} className="animate-spin text-[#25D366]" />
                <span className="text-center">Generating combined decision message & group links...</span>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Decision message to be dispatched:</span>
                  <span className="font-mono">{queueMsg.length} chars</span>
                </div>
                <textarea
                  value={queueMsg}
                  onChange={(e) => setQueueMsg(e.target.value)}
                  rows={6}
                  dir="rtl"
                  className="w-full bg-black/60 border border-white/15 focus:border-[#25D366] rounded-xl p-3 text-xs text-white outline-none leading-relaxed font-sans"
                />
              </div>
            )}

            {/* Queue Actions Footer (Mobile Responsive) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-white/10">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleQueueNext()}
                  className="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold transition text-center"
                >
                  Skip to Next
                </button>
                <button
                  type="button"
                  onClick={handleCopyQueueMessage}
                  className="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition flex items-center justify-center gap-1.5"
                >
                  {queueCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{queueCopied ? 'Copied' : 'Copy Text'}</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={async () => {
                    await handleMarkDecisionWhatsappSent(currentQueueApplicant.id);
                    handleQueueNext();
                  }}
                  className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition text-center"
                  title="Mark as sent without opening WhatsApp tab"
                >
                  Mark Sent (Skip WA)
                </button>

                <button
                  type="button"
                  onClick={handleQueueOpenAndNext}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-[#25D366]/25 transition active:scale-95"
                >
                  <MessageSquare size={14} className="fill-slate-950" />
                  <span>Open WhatsApp & Next</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApplicantsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-16 rounded-2xl bg-white/5 animate-pulse" />
          <div className="admin-card rounded-2xl p-6 overflow-hidden">
            <table className="w-full text-left">
              <tbody>
                <SkeletonTableRows rows={8} />
              </tbody>
            </table>
          </div>
        </div>
      }
    >
      <ApplicantsContent />
    </React.Suspense>
  );
}
