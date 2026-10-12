'use client';

/**
 * @file head-availability/page.tsx
 * @brief Head Interview Pool & Availability Configuration Studio.
 * @details Covers Tech Head Pool (General/Software/Hardware), Media Head Pool
 *          (Visuals/Graphics/Marketing), PR Head, Events Head, and HR Head.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import React, { useEffect, useState } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  Users,
  Shield,
  Layers,
} from 'lucide-react';
import { HeadAvailabilityWindow, HeadCategory, formatTimeTo12h } from '@ieee-recruitment/shared';

const HEAD_CATEGORIES: Array<{ id: HeadCategory; label: string; poolNote: string }> = [
  {
    id: 'TECH_HEAD',
    label: 'Tech Head (Software / Hardware / General)',
    poolNote: 'Any Tech Head can conduct any Tech interview.',
  },
  {
    id: 'MEDIA_HEAD',
    label: 'Media Head (Visuals / Graphics / Marketing)',
    poolNote: 'Any Media Head can conduct any Media interview.',
  },
  {
    id: 'PR_HEAD',
    label: 'PR & Logistics Head',
    poolNote: 'Dedicated head required for PR & Logistics applicants.',
  },
  {
    id: 'EVENTS_HEAD',
    label: 'Events Head',
    poolNote: 'Dedicated head required for Events applicants.',
  },
  {
    id: 'HR_HEAD',
    label: 'HR Head',
    poolNote: 'Dedicated head required for HR applicants.',
  },
];

export default function HeadAvailabilityPage() {
  const [windows, setWindows] = useState<HeadAvailabilityWindow[]>([]);
  const [loading, setLoading] = useState(true);

  // New Head Window State
  const [headName, setHeadName] = useState('');
  const [headCategory, setHeadCategory] = useState<HeadCategory>('TECH_HEAD');
  const [date, setDate] = useState('2026-09-25');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('15:00');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchWindows = async () => {
    try {
      const res = await fetch('/api/heads/availability');
      const data = await res.json();
      if (data.success) {
        setWindows(data.windows);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWindows();
  }, []);

  const handleAddWindow = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);

    try {
      const newWindow = {
        headName: headName.trim(),
        headCategory,
        date,
        startTime,
        endTime,
        isAvailable: true,
      };

      const updated = [...windows, newWindow];
      const res = await fetch('/api/heads/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ windows: updated }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Availability window recorded for "${headName}".`);
        setHeadName('');
        await fetchWindows();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveWindow = async (index: number) => {
    const updated = windows.filter((_, i) => i !== index);
    try {
      await fetch('/api/heads/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ windows: updated }),
      });
      await fetchWindows();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="border-b border-white/10 pb-6">
        <div className="border-l-2 border-[#00a1c0] pl-2.5 mb-1.5">
          <span className="text-xs font-extrabold text-[#00a1c0] tracking-widest uppercase">
            Interview Resource Allocation
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Head Availability <span className="text-[#00a1c0]">Windows.</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Define availability for Tech, Media, PR, Events, and HR Heads to power the scheduling engine.
        </p>
      </div>

      {/* Head Pool Architecture Callout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#023260]/40 border border-[#00a1c0]/30 rounded-2xl p-4 space-y-1.5 text-xs text-slate-200">
          <div className="flex items-center gap-2 font-bold text-white text-sm">
            <Shield size={16} className="text-[#00a1c0]" />
            Tech Head Pool Rule
          </div>
          <p className="leading-relaxed">
            All Tech teams (Software, Hardware, General) share a single Tech Head availability pool. Any available Tech Head can evaluate any Tech candidate.
          </p>
        </div>

        <div className="bg-purple-950/30 border border-purple-500/30 rounded-2xl p-4 space-y-1.5 text-xs text-slate-200">
          <div className="flex items-center gap-2 font-bold text-white text-sm">
            <Layers size={16} className="text-purple-400" />
            Media Head Pool Rule
          </div>
          <p className="leading-relaxed">
            Media teams (Visuals, Graphics, Marketing) share a single Media Head availability pool. For example, a Marketing Head can evaluate a Visuals applicant.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form: Add Head Window */}
        <div className="admin-card rounded-3xl p-6 sm:p-7 space-y-5">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Plus size={18} className="text-[#00a1c0]" />
            Register Head Availability
          </h2>
          <p className="text-xs text-slate-400">
            Specify the Head&apos;s name, assigned committee category, and time window.
          </p>

          {successMsg && (
            <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-xl p-3 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleAddWindow} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Head Name</label>
              <input
                type="text"
                required
                value={headName}
                onChange={(e) => setHeadName(e.target.value)}
                placeholder="e.g. Kareem (Software Head) or Youssef (PR Head)"
                className="w-full bg-black/40 border border-white/15 focus:border-[#00a1c0] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Head Category / Pool</label>
              <select
                value={headCategory}
                onChange={(e) => setHeadCategory(e.target.value as HeadCategory)}
                className="w-full bg-black/40 border border-white/15 focus:border-[#00a1c0] rounded-xl px-3 py-2 text-xs text-white outline-none"
              >
                {HEAD_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#011c38]">
                    {c.label}
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
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-2 py-2 text-xs text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Start Time {startTime && <span className="text-sky-400 font-normal font-mono">({formatTimeTo12h(startTime)})</span>}</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-2 py-2 text-xs text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">End Time {endTime && <span className="text-sky-400 font-normal font-mono">({formatTimeTo12h(endTime)})</span>}</label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-2 py-2 text-xs text-white outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#023260] to-[#00a1c0] hover:brightness-110 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Add Head Window'}
            </button>
          </form>
        </div>

        {/* Windows List */}
        <div className="admin-card rounded-3xl p-6 sm:p-7 space-y-4">
          <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center justify-between">
            <span>Configured Head Windows ({windows.length})</span>
            <Clock size={16} className="text-[#00a1c0]" />
          </h3>

          {loading ? (
            <p className="text-xs text-slate-500 text-center py-6">Loading windows...</p>
          ) : windows.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">No Head windows registered.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {windows.map((w, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-black/20 border border-white/10 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{w.headName}</span>
                      <span className="text-[10px] px-2 py-0.2 rounded bg-white/10 text-[#00a1c0] font-semibold">
                        {w.headCategory}
                      </span>
                    </div>
                    <span className="text-slate-400 font-mono text-[11px] block">
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
  );
}
