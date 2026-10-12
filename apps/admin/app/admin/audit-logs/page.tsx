'use client';

/**
 * @file audit-logs/page.tsx
 * @brief Administrative Audit Ledger View.
 * @details Real-time transparency log tracking all administrative and HR actions,
 *          decisions, configuration updates, and email transmissions.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Clock,
  User,
  Activity,
  FileText,
  ChevronDown,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { SkeletonAuditRows } from '@/components/Skeletons';

interface AuditLog {
  id: string;
  actorRole: 'ADMIN' | 'HR' | 'SYSTEM';
  actorName: string;
  action: string;
  details: Record<string, any>;
  timestamp: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'HR' | 'SYSTEM'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLogs = async (silent = false) => {
    if (!silent && logs.length === 0) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);
    try {
      const res = await fetch('/api/audit-logs');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch audit trail.');
      const rawLogs = data.logs || [];
      const normalizedLogs: AuditLog[] = rawLogs.map((l: any) => ({
        id: l.id || crypto.randomUUID(),
        actorRole: ((l.actorRole || l.actorType || 'SYSTEM').toUpperCase()) as any,
        actorName: l.actorName || 'System Service',
        action: l.action || 'ACTIVITY_LOGGED',
        details: l.details || {},
        timestamp: l.timestamp || l.createdAt || new Date().toISOString(),
      }));
      setLogs(normalizedLogs);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs(false);

    // Live background auto-refresh every 8s
    const interval = setInterval(() => {
      fetchLogs(true);
    }, 8000);

    const handleFocus = () => fetchLogs(true);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (roleFilter !== 'ALL' && log.actorRole !== roleFilter) return false;
      if (!search.trim()) return true;

      const q = search.toLowerCase();
      const matchAction = log.action.toLowerCase().includes(q);
      const matchActor = log.actorName.toLowerCase().includes(q);
      const matchDetails = JSON.stringify(log.details).toLowerCase().includes(q);
      return matchAction || matchActor || matchDetails;
    });
  }, [logs, search, roleFilter]);

  const stats = useMemo(() => {
    return {
      total: logs.length,
      admin: logs.filter((l) => l.actorRole === 'ADMIN').length,
      hr: logs.filter((l) => l.actorRole === 'HR').length,
      system: logs.filter((l) => l.actorRole === 'SYSTEM').length,
    };
  }, [logs]);

  const getActionBadgeColor = (action: string) => {
    if (action.includes('DELETE') || action.includes('REMOVE')) {
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    }
    if (action.includes('CREATE') || action.includes('GENERATE') || action.includes('SUBMIT')) {
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    }
    if (action.includes('SEND') || action.includes('MAIL')) {
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
    return 'bg-[#00a1c0]/20 text-[#00a1c0] border-[#00a1c0]/30';
  };

  const getRoleBadge = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'HR':
        return 'bg-[#00a1c0]/20 text-[#00a1c0] border-[#00a1c0]/30';
      case 'SYSTEM':
      default:
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="border-l-2 border-[#00a1c0] pl-2.5 mb-1.5">
            <span className="text-xs font-extrabold text-[#00a1c0] tracking-widest uppercase">
              System Compliance
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Audit Ledger & <span className="text-[#00a1c0]">Compliance.</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Immutable tracking of administrative decisions, scheduler dispatches, and HR evaluations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Auto-Sync (8s)</span>
          </div>

          <button
            onClick={() => fetchLogs(false)}
            disabled={loading || isRefreshing}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold border border-white/10 transition"
          >
            <RefreshCw size={16} className={loading || isRefreshing ? 'animate-spin text-[#00a1c0]' : ''} />
            <span>Refresh Trail</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#022344]/80 border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-300">
            <FileText size={20} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Events</div>
            <div className="text-xl font-bold text-white">{stats.total}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#022344]/80 border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
            <Activity size={20} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Admin Actions</div>
            <div className="text-xl font-bold text-purple-300">{stats.admin}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#022344]/80 border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00a1c0]/10 flex items-center justify-center text-[#00a1c0]">
            <User size={20} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">HR Submissions</div>
            <div className="text-xl font-bold text-[#00a1c0]">{stats.hr}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#022344]/80 border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Automated / System</div>
            <div className="text-xl font-bold text-amber-300">{stats.system}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#022344]/80 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search action, actor, or detail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#011c38] text-sm text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-2 border border-white/10 focus:outline-none focus:border-[#00a1c0]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <Filter size={14} className="text-slate-400 flex-shrink-0" />
          <span className="text-xs text-slate-400 font-medium flex-shrink-0">Role:</span>
          {(['ALL', 'ADMIN', 'HR', 'SYSTEM'] as const).map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex-shrink-0 border ${
                roleFilter === role
                  ? 'bg-[#00a1c0] text-[#02182B] border-[#00a1c0]'
                  : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Ledger Table */}
      <div className="rounded-2xl bg-[#022344]/80 border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-[#011c38] text-xs uppercase tracking-wider text-slate-400 border-b border-white/10">
              <tr>
                <th className="px-5 py-3.5 w-12 text-center"></th>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Actor</th>
                <th className="px-5 py-3.5">Action Executed</th>
                <th className="px-5 py-3.5">Key Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && logs.length === 0 ? (
                <SkeletonAuditRows rows={6} />
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  const parsed = new Date(log.timestamp);
                  const dateStr = !isNaN(parsed.getTime())
                    ? parsed.toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'medium',
                      })
                    : 'Just now';

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        className="hover:bg-white/5 transition cursor-pointer"
                      >
                        <td className="px-5 py-3.5 text-center text-slate-400">
                          {isExpanded ? (
                            <ChevronDown size={16} className="text-[#00a1c0]" />
                          ) : (
                            <ChevronRight size={16} />
                          )}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs font-mono text-slate-400">
                          {dateStr}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border ${getRoleBadge(
                                log.actorRole
                              )}`}
                            >
                              {log.actorRole}
                            </span>
                            <span className="font-semibold text-white text-xs">{log.actorName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold border ${getActionBadgeColor(
                              log.action
                            )}`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-400 max-w-xs truncate">
                          {Object.entries(log.details || {})
                            .slice(0, 2)
                            .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
                            .join(' | ') || 'No extra metadata'}
                        </td>
                      </tr>

                      {/* Expandable JSON details */}
                      {isExpanded && (
                        <tr className="bg-[#011c38]/70">
                          <td colSpan={5} className="px-8 py-4">
                            <div className="space-y-2">
                              <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                                <Activity size={14} className="text-[#00a1c0]" />
                                Full Event Payload (Record ID: <span className="font-mono text-slate-400">{log.id}</span>)
                              </div>
                              <pre className="bg-[#011428] p-3.5 rounded-xl text-xs font-mono text-[#00a1c0] border border-white/5 overflow-x-auto">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
