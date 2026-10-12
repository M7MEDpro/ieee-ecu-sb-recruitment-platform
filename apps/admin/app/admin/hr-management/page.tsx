'use client';

/**
 * @file hr-management/page.tsx
 * @brief HR Account Provisioning & Availability Window Management Studio.
 * @details HR accounts are created exclusively by the Full Admin with Name & Password.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import React, { useEffect, useState } from 'react';
import {
  UserCog,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  ShieldCheck,
  Eye,
  EyeOff,
  Copy,
  Check,
  Key,
  X,
} from 'lucide-react';
import { HRAccount, HRAvailabilityWindow, formatTimeTo12h } from '@ieee-recruitment/shared';
import {
  getClientCached,
  setClientCached,
  invalidateClientCache,
  isClientCacheFresh,
} from '@/lib/clientCache';
import { SkeletonList } from '@/components/Skeletons';

export default function HRManagementPage() {
  const [accounts, setAccounts] = useState<HRAccount[]>([]);
  const [windows, setWindows] = useState<HRAvailabilityWindow[]>([]);
  const [loading, setLoading] = useState(true);

  // New HR Account State
  const [newHRName, setNewHRName] = useState('');
  const [newHRPassword, setNewHRPassword] = useState('');
  const [creatingHR, setCreatingHR] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [createErr, setCreateErr] = useState<string | null>(null);

  // Password visibility & copying state for Full Admin
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAllPasswords, setShowAllPasswords] = useState(false);

  // Reset / Set Password Modal State
  const [resettingHR, setResettingHR] = useState<{ id: string; name: string } | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [savingNewPassword, setSavingNewPassword] = useState(false);

  // New Availability Window State
  const [selectedHRId, setSelectedHRId] = useState('');
  const [availDate, setAvailDate] = useState('2026-09-25');
  const [availStart, setAvailStart] = useState('09:00');
  const [availEnd, setAvailEnd] = useState('15:00');
  const [savingAvail, setSavingAvail] = useState(false);

  const fetchData = async (silent = false) => {
    if (!silent && accounts.length === 0) {
      setLoading(true);
    }
    try {
      const [hrRes, winRes] = await Promise.all([
        fetch('/api/hr', { cache: 'no-store' }),
        fetch('/api/hr/availability', { cache: 'no-store' }),
      ]);

      const hrData = await hrRes.json();
      const winData = await winRes.json();

      if (hrData.success) {
        const cleanAccounts = (hrData.accounts || []).filter(
          (h: any) => !h.name?.toLowerCase().includes('amar')
        );
        setAccounts(cleanAccounts);
        setClientCached('hr_accounts', cleanAccounts);
        setSelectedHRId((prev) => {
          if (prev && cleanAccounts.some((a: any) => a.id === prev)) {
            return prev;
          }
          return cleanAccounts[0]?.id || '';
        });
      }
      if (winData.success) {
        const cleanWindows = (winData.windows || []).filter(
          (w: any) => !w.hrName?.toLowerCase().includes('amar')
        );
        setWindows(cleanWindows);
        setClientCached('hr_windows', cleanWindows);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cachedAcc = getClientCached<HRAccount[]>('hr_accounts');
    const cachedWin = getClientCached<HRAvailabilityWindow[]>('hr_windows');
    if (cachedAcc && cachedAcc.length > 0) {
      const cleanAcc = cachedAcc.filter((h) => !h.name?.toLowerCase().includes('amar'));
      setAccounts(cleanAcc);
      setSelectedHRId((prev) => prev || cleanAcc[0]?.id || '');
      setLoading(false);
    }
    if (cachedWin && cachedWin.length > 0) {
      const cleanWin = cachedWin.filter((w) => !w.hrName?.toLowerCase().includes('amar'));
      setWindows(cleanWin);
    }
    const isFresh = isClientCacheFresh('hr_accounts', 15000);
    fetchData(isFresh);

    // Live background auto-refresh every 10s without clobbering input state
    const interval = setInterval(() => {
      fetchData(true);
    }, 10000);

    const handleFocus = () => fetchData(true);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleCreateHR = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingHR(true);
    setCreateMsg(null);
    setCreateErr(null);

    try {
      const res = await fetch('/api/hr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newHRName, password: newHRPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create HR account.');
      }

      setCreateMsg(`HR account "${newHRName}" created successfully.`);
      setNewHRName('');
      setNewHRPassword('');
      invalidateClientCache('hr_accounts');
      await fetchData();
    } catch (err: any) {
      setCreateErr(err.message);
    } finally {
      setCreatingHR(false);
    }
  };

  const handleDeleteHR = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete HR account "${name}"? Any assigned interview slots will be unassigned.`)) {
      return;
    }

    // 0ms Optimistic UI update
    setAccounts((prev) => prev.filter((h) => h.id !== id));
    setCreateMsg(null);
    setCreateErr(null);
    invalidateClientCache('hr_accounts');

    try {
      const res = await fetch(`/api/hr?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete HR account.');
      }
      setCreateMsg(`HR account "${name}" deleted permanently.`);
    } catch (err: any) {
      setCreateErr(err.message);
      fetchData();
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingHR || !newPasswordValue.trim()) return;
    setSavingNewPassword(true);
    setCreateErr(null);
    try {
      const res = await fetch('/api/hr', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: resettingHR.id, password: newPasswordValue.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update password');
      setAccounts((prev) =>
        prev.map((a) => (a.id === resettingHR.id ? { ...a, plainPassword: newPasswordValue.trim() } : a))
      );
      setShowPasswords((prev) => ({ ...prev, [resettingHR.id]: true }));
      setCreateMsg(`Password for ${resettingHR.name} updated successfully.`);
      setResettingHR(null);
      setNewPasswordValue('');
      invalidateClientCache('hr_accounts');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingNewPassword(false);
    }
  };

  const handleAddAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHRId) return;
    setSavingAvail(true);

    try {
      const selectedHr = accounts.find((a) => a.id === selectedHRId);
      const newWindow: HRAvailabilityWindow = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `temp-${Date.now()}`,
        hrId: selectedHRId,
        hrName: selectedHr?.name || 'HR',
        date: availDate,
        startTime: availStart,
        endTime: availEnd,
        isAvailable: true,
      };

      // 0ms Optimistic UI update so window appears in Configured Windows immediately!
      const updatedWindows = [...windows, newWindow];
      setWindows(updatedWindows);

      const res = await fetch('/api/hr/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ windows: updatedWindows }),
      });

      const data = await res.json();
      if (data.success) {
        invalidateClientCache('hr_windows');
        await fetchData(true);
      }
    } catch (e) {
      console.error(e);
      await fetchData(true);
    } finally {
      setSavingAvail(false);
    }
  };

  const handleRemoveWindow = async (index: number) => {
    const updated = windows.filter((_, i) => i !== index);
    setWindows(updated); // 0ms Optimistic removal
    try {
      const res = await fetch('/api/hr/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ windows: updated }),
      });
      const data = await res.json();
      if (data.success) {
        invalidateClientCache('hr_windows');
        await fetchData(true);
      }
    } catch (e) {
      console.error(e);
      await fetchData(true);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="text-xs font-bold text-[#00a1c0] tracking-widest uppercase">
            HR Administration
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            HR Accounts & Availability
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Create interviewer accounts and configure their scheduling windows.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Auto-Sync (10s)</span>
          </div>

          <button
            onClick={() => fetchData(false)}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Create HR Account & Account List */}
        <div className="space-y-6">
          <div className="admin-card rounded-3xl p-6 sm:p-7 space-y-5">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Plus size={18} className="text-[#00a1c0]" />
              Create New HR Account
            </h2>
            <p className="text-xs text-slate-400">
              HR accounts contain only a Name and Password. HR members can only access their assigned interviews.
            </p>

            {createMsg && (
              <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-xl p-3 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                <span>{createMsg}</span>
              </div>
            )}

            {createErr && (
              <div className="bg-red-950/80 border border-red-500/40 rounded-xl p-3 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="text-[#D92525] flex-shrink-0" />
                <span>{createErr}</span>
              </div>
            )}

            <form onSubmit={handleCreateHR} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">HR Full Name</label>
                <input
                  type="text"
                  required
                  value={newHRName}
                  onChange={(e) => setNewHRName(e.target.value)}
                  placeholder="e.g. Mariam HR"
                  className="w-full bg-black/40 border border-white/15 focus:border-[#00a1c0] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Password</label>
                <input
                  type="password"
                  required
                  value={newHRPassword}
                  onChange={(e) => setNewHRPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/40 border border-white/15 focus:border-[#00a1c0] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={creatingHR}
                className="w-full py-2.5 rounded-xl bg-[#00a1c0] hover:bg-[#008ba6] text-white text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
              >
                {creatingHR ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <UserCog size={15} />
                    Create HR Account
                  </>
                )}
              </button>
            </form>
          </div>

          {/* HR Account List */}
          <div className="admin-card rounded-3xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Active HR Accounts ({accounts.length})</span>
                  <ShieldCheck size={16} className="text-[#00a1c0]" />
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Full Admin privileged view: Click the eye icon to reveal or copy credentials.
                </p>
              </div>

              {accounts.length > 0 && (
                <button
                  onClick={() => setShowAllPasswords((prev) => !prev)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-semibold border border-white/10 flex items-center gap-1.5 transition"
                >
                  {showAllPasswords ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showAllPasswords ? 'Hide All' : 'Show All Passwords'}</span>
                </button>
              )}
            </div>

            {loading && accounts.length === 0 ? (
              <SkeletonList items={3} />
            ) : accounts.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No HR accounts created yet.</p>
            ) : (
              <div className="divide-y divide-white/5 rounded-xl bg-black/20 border border-white/10 overflow-hidden">
                {accounts.map((hr) => {
                  const isVisible = showAllPasswords || showPasswords[hr.id];
                  const passwordDisplay = hr.plainPassword || '••••••••';
                  const isCopied = copiedId === hr.id;

                  return (
                    <div key={hr.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="font-bold text-white block text-sm">{hr.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-slate-400 font-mono">ID: {hr.id.slice(0, 8)}...</span>
                          <span className="text-slate-500">•</span>
                          {/* Password Badge */}
                          <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                            <span className="text-[10px] text-slate-400 font-semibold">Pass:</span>
                            {isVisible ? (
                              hr.plainPassword ? (
                                <span className="font-mono text-xs font-bold text-emerald-400 select-all">
                                  {hr.plainPassword}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setResettingHR({ id: hr.id, name: hr.name });
                                    setNewPasswordValue('');
                                  }}
                                  className="text-[11px] text-amber-400 font-bold hover:underline flex items-center gap-1"
                                >
                                  <span>Not Stored</span>
                                  <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded border border-amber-500/30">Set Pass</span>
                                </button>
                              )
                            ) : (
                              <span className="font-mono text-xs text-slate-500 tracking-widest">••••••••</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        {/* Set / Reset Password Button */}
                        <button
                          onClick={() => {
                            setResettingHR({ id: hr.id, name: hr.name });
                            setNewPasswordValue(hr.plainPassword || '');
                          }}
                          title="Set or Change Password"
                          className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition flex items-center gap-1"
                        >
                          <Key size={13} />
                          <span className="text-[10px] font-bold">Pass</span>
                        </button>

                        {/* Toggle Password Visibility */}
                        <button
                          onClick={() => setShowPasswords((prev) => ({ ...prev, [hr.id]: !prev[hr.id] }))}
                          title={isVisible ? 'Hide Password' : 'Show Password'}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition"
                        >
                          {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>

                        {/* Copy Login Credentials for WhatsApp */}
                        <button
                          onClick={() => {
                            const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ieee-ecu-admin.vercel.app';
                            const text = `بيانات حساب عضو الـ HR في IEEE ECU SB:\nالاسم: ${hr.name}\nكلمة المرور: ${hr.plainPassword || 'تم تعيينها عند الإنشاء'}\nرابط تسجيل الدخول: ${origin}/login`;
                            navigator.clipboard.writeText(text);
                            setCopiedId(hr.id);
                            setTimeout(() => setCopiedId(null), 2500);
                          }}
                          title="Copy login details to send via WhatsApp"
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition ${
                            isCopied
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-white/5 hover:bg-[#00a1c0]/20 text-slate-300 hover:text-[#00a1c0] border-white/10'
                          }`}
                        >
                          {isCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                          <span>{isCopied ? 'Copied!' : 'Copy Info'}</span>
                        </button>

                        {/* Delete HR Account */}
                        <button
                          onClick={() => handleDeleteHR(hr.id, hr.name)}
                          title="Delete HR Account"
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition ml-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: HR Availability Windows */}
        <div className="space-y-6">
          <div className="admin-card rounded-3xl p-6 sm:p-7 space-y-5">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Clock size={18} className="text-[#00a1c0]" />
              Add HR Availability Window
            </h2>
            <p className="text-xs text-slate-400">
              The scheduler engine will only assign interviews when an HR is available within these exact hours.
            </p>

            <form onSubmit={handleAddAvailability} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Select HR</label>
                <select
                  value={selectedHRId}
                  onChange={(e) => setSelectedHRId(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 focus:border-[#00a1c0] rounded-xl px-3 py-2 text-xs text-white outline-none"
                >
                  {accounts.map((hr) => (
                    <option key={hr.id} value={hr.id} className="bg-[#011c38]">
                      {hr.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Date</label>
                  <input
                    type="date"
                    required
                    value={availDate}
                    onChange={(e) => setAvailDate(e.target.value)}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-2 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Start Time {availStart && <span className="text-sky-400 font-normal font-mono">({formatTimeTo12h(availStart)})</span>}</label>
                  <input
                    type="time"
                    required
                    value={availStart}
                    onChange={(e) => setAvailStart(e.target.value)}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-2 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">End Time {availEnd && <span className="text-sky-400 font-normal font-mono">({formatTimeTo12h(availEnd)})</span>}</label>
                  <input
                    type="time"
                    required
                    value={availEnd}
                    onChange={(e) => setAvailEnd(e.target.value)}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-2 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingAvail || accounts.length === 0}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#023260] to-[#00a1c0] hover:brightness-110 text-white text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {savingAvail ? 'Saving Window...' : 'Add Availability Window'}
              </button>
            </form>
          </div>

          {/* Configured Windows List */}
          <div className="admin-card rounded-3xl p-6 sm:p-7 space-y-4">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center justify-between">
              <span>Configured Windows ({windows.length})</span>
              <Calendar size={16} className="text-[#00a1c0]" />
            </h3>

            {windows.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No availability windows set.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {windows.map((w, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-black/20 border border-white/10 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-white block">{w.hrName}</span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {w.date} • {formatTimeTo12h(w.startTime)} – {formatTimeTo12h(w.endTime)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveWindow(idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reset / Set Password Modal */}
      {resettingHR && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#021b36] border border-[#00a1c0]/40 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <Key size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Set / Reset Password</h3>
                  <p className="text-xs text-slate-400">Account: <span className="text-white font-semibold">{resettingHR.name}</span></p>
                </div>
              </div>
              <button
                onClick={() => setResettingHR(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  New Password (at least 6 characters)
                </label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  placeholder="e.g. Min 8 characters"
                  className="w-full bg-[#011429] text-sm text-white placeholder-slate-500 rounded-xl p-3 border border-white/15 focus:outline-none focus:border-[#00a1c0] font-mono"
                  autoFocus
                />
                <p className="text-[11px] text-slate-400">
                  This password will be immediately visible to admins and ready to share with the HR member.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setResettingHR(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNewPassword || newPasswordValue.length < 6}
                  className="px-5 py-2 rounded-xl bg-[#00a1c0] hover:bg-[#008ba6] text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 shadow-md shadow-[#00a1c0]/20"
                >
                  {savingNewPassword ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Save & Reveal Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
