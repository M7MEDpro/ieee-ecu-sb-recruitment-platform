'use client';

/**
 * @file criteria/page.tsx
 * @brief Dynamic Evaluation Criteria Governance Studio.
 * @details Allows Admin to define unlimited criteria across General, Tech,
 *          and Non-Tech sections with custom score ranges and ordering.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import React, { useEffect, useState } from 'react';
import {
  Sliders,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  Edit2,
  Layers,
  FileText,
  Hash,
} from 'lucide-react';
import { EvaluationCriterion, EvaluationSectionType, TEAMS } from '@ieee-recruitment/shared';
import { SkeletonList } from '@/components/Skeletons';
import { CriteriaDescription } from '@/components/CriteriaDescription';

export default function EvaluationCriteriaPage() {
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>([]);
  const [loading, setLoading] = useState(true);

  // New/Edit Criterion State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [section, setSection] = useState<EvaluationSectionType>('GENERAL');
  const [teamCategory, setTeamCategory] = useState('ALL');
  const [description, setDescription] = useState('');
  const [responseType, setResponseType] = useState<'SCORE' | 'PARAGRAPH'>('SCORE');
  const [minScore, setMinScore] = useState(1);
  const [maxScore, setMaxScore] = useState(10);
  const [orderIndex, setOrderIndex] = useState(1);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const fetchCriteria = async () => {
    try {
      const res = await fetch('/api/criteria');
      const data = await res.json();
      if (data.success) {
        setCriteria(data.criteria);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCriteria();
  }, []);

  const handleSaveCriterion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      const payload: any = {
        name: name.trim(),
        section,
        teamCategory,
        description: description.trim(),
        responseType,
        minScore: responseType === 'SCORE' ? Number(minScore) : 0,
        maxScore: responseType === 'SCORE' ? Number(maxScore) : 0,
        orderIndex: Number(orderIndex),
        isActive: true,
      };

      if (editingId) {
        payload.id = editingId;
      }

      const res = await fetch('/api/criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save criterion.');
      }

      setMsg(editingId ? 'Criterion updated successfully.' : 'New criterion added.');
      resetForm();
      await fetchCriteria();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (crit: EvaluationCriterion) => {
    setEditingId(crit.id);
    setName(crit.name);
    setSection(crit.section);
    setTeamCategory(crit.teamCategory);
    setDescription(crit.description || '');
    setResponseType(crit.responseType || 'SCORE');
    setMinScore(crit.minScore);
    setMaxScore(crit.maxScore);
    setOrderIndex(crit.orderIndex);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this evaluation criterion?')) return;
    try {
      await fetch(`/api/criteria?id=${id}`, { method: 'DELETE' });
      await fetchCriteria();
    } catch (e) {
      console.error(e);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setResponseType('SCORE');
    setMinScore(1);
    setMaxScore(10);
    setOrderIndex(criteria.length + 1);
  };

  const generalCriteria = criteria.filter((c) => c.section === 'GENERAL');
  const techCriteria = criteria.filter((c) => c.section === 'TECH');
  const nonTechCriteria = criteria.filter((c) => c.section === 'NON_TECH');

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="border-b border-white/10 pb-6">
        <span className="text-xs font-bold text-[#00a1c0] tracking-widest uppercase">
          Evaluation Engine
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Dynamic Evaluation Criteria
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Configure unbounded criteria across General, Tech, and Non-Tech sections with custom score ranges.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Create/Edit Form */}
        <div className="admin-card rounded-3xl p-6 space-y-5 h-fit">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="font-bold text-base text-white flex items-center gap-2">
              <Sliders size={18} className="text-[#00a1c0]" />
              {editingId ? 'Edit Criterion' : 'Create Criterion'}
            </h2>
            {editingId && (
              <button
                onClick={resetForm}
                className="text-xs text-slate-400 hover:text-white underline"
              >
                Cancel Edit
              </button>
            )}
          </div>

          {msg && (
            <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-xl p-3 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
              <span>{msg}</span>
            </div>
          )}

          <form onSubmit={handleSaveCriterion} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Criterion Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Algorithmic Problem Solving"
                className="w-full bg-black/40 border border-white/15 focus:border-[#00a1c0] rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Section</label>
              <select
                value={section}
                onChange={(e) => {
                  const newSection = e.target.value as EvaluationSectionType;
                  setSection(newSection);
                  setTeamCategory('ALL');
                }}
                className="w-full bg-black/40 border border-white/15 focus:border-[#00a1c0] rounded-xl px-3 py-2 text-xs text-white outline-none"
              >
                <option value="GENERAL" className="bg-[#011c38]">GENERAL (Always Shown)</option>
                <option value="TECH" className="bg-[#011c38]">TECH (Only for Tech Candidates)</option>
                <option value="NON_TECH" className="bg-[#011c38]">NON_TECH (Only for Non-Tech Candidates)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Team Scope</label>
              {section === 'GENERAL' ? (
                <select
                  value="ALL"
                  disabled
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-400 outline-none cursor-not-allowed"
                >
                  <option value="ALL">All Applicants (General Evaluation)</option>
                </select>
              ) : (
                <select
                  value={teamCategory}
                  onChange={(e) => setTeamCategory(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 focus:border-[#00a1c0] rounded-xl px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="ALL" className="bg-[#011c38]">
                    {section === 'TECH' ? 'All Tech Committees' : 'All Non-Tech Committees'}
                  </option>
                  {TEAMS.filter((t) => t.broadCategory === section).map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#011c38]">
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Description / Guidelines</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Guidance for the interviewer when rating..."
                className="w-full bg-black/40 border border-white/15 focus:border-[#00a1c0] rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>

            {/* Assessment Response Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Assessment Format</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 border border-white/10 rounded-xl">
                <button
                  type="button"
                  onClick={() => setResponseType('SCORE')}
                  className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    responseType === 'SCORE'
                      ? 'bg-[#00a1c0] text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Hash size={13} />
                  <span>Rating Scale</span>
                </button>
                <button
                  type="button"
                  onClick={() => setResponseType('PARAGRAPH')}
                  className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    responseType === 'PARAGRAPH'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText size={13} />
                  <span>Written Assessment</span>
                </button>
              </div>
            </div>

            {responseType === 'SCORE' ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Min Score</label>
                  <input
                    type="number"
                    value={minScore}
                    onChange={(e) => setMinScore(Number(e.target.value))}
                    min={0}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Max Score</label>
                  <input
                    type="number"
                    value={maxScore}
                    onChange={(e) => setMaxScore(Number(e.target.value))}
                    min={1}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300 flex items-start gap-2">
                <FileText size={14} className="shrink-0 mt-0.5 text-indigo-400" />
                <span>
                  Interviewer will write a descriptive free-form paragraph assessment during the live interview instead of picking a score.
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#023260] to-[#00a1c0] hover:brightness-110 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus size={15} />
                  {editingId ? 'Update Criterion' : 'Create Criterion'}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right: Section Columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section A: GENERAL */}
          <div className="admin-card rounded-3xl p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-white" />
                General Section ({generalCriteria.length})
              </h3>
              <span className="text-[10px] text-slate-400">Universal for all applicants</span>
            </div>

            <div className="divide-y divide-white/5 bg-black/20 rounded-xl border border-white/10 overflow-hidden">
              {loading && criteria.length === 0 ? (
                <SkeletonList items={3} />
              ) : generalCriteria.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No general criteria defined yet.
                </div>
              ) : (
                generalCriteria.map((crit) => (
                  <div key={crit.id} className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-3 text-xs">
                    <div className="space-y-1 flex-1 min-w-0">
                      <span className="font-bold text-white text-sm block">{crit.name}</span>
                      <CriteriaDescription description={crit.description} />
                    </div>
                    <div className="flex items-center gap-3 shrink-0 self-end md:self-start pt-1">
                      {crit.responseType === 'PARAGRAPH' ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium whitespace-nowrap">
                          Written Assessment
                        </span>
                      ) : (
                        <span className="font-mono text-[11px] text-[#00c2e0] whitespace-nowrap font-bold">
                          Scale: {crit.minScore}–{crit.maxScore}
                        </span>
                      )}
                      <button
                        onClick={() => handleEdit(crit)}
                        className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
                        title="Edit criterion"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(crit.id)}
                        className="p-1.5 rounded bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 cursor-pointer"
                        title="Delete criterion"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section B: TECH */}
          <div className="admin-card rounded-3xl p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00a1c0]" />
                Technical Section ({techCriteria.length})
              </h3>
              <span className="text-[10px] text-[#00a1c0]">Filtered only for Tech applicants</span>
            </div>

            <div className="divide-y divide-white/5 bg-black/20 rounded-xl border border-white/10 overflow-hidden">
              {loading && criteria.length === 0 ? (
                <SkeletonList items={3} />
              ) : techCriteria.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No technical criteria defined yet.
                </div>
              ) : (
                techCriteria.map((crit) => (
                  <div key={crit.id} className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-3 text-xs">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">{crit.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-[#00c2e0] font-semibold">
                          {crit.teamCategory}
                        </span>
                      </div>
                      <CriteriaDescription description={crit.description} />
                    </div>
                    <div className="flex items-center gap-3 shrink-0 self-end md:self-start pt-1">
                      {crit.responseType === 'PARAGRAPH' ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium whitespace-nowrap">
                          Written Assessment
                        </span>
                      ) : (
                        <span className="font-mono text-[11px] text-[#00c2e0] whitespace-nowrap font-bold">
                          Scale: {crit.minScore}–{crit.maxScore}
                        </span>
                      )}
                      <button
                        onClick={() => handleEdit(crit)}
                        className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
                        title="Edit criterion"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(crit.id)}
                        className="p-1.5 rounded bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 cursor-pointer"
                        title="Delete criterion"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section C: NON-TECH */}
          <div className="admin-card rounded-3xl p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                Non-Technical Section ({nonTechCriteria.length})
              </h3>
              <span className="text-[10px] text-purple-400">Filtered only for Non-Tech applicants</span>
            </div>

            <div className="divide-y divide-white/5 bg-black/20 rounded-xl border border-white/10 overflow-hidden">
              {loading && criteria.length === 0 ? (
                <SkeletonList items={3} />
              ) : nonTechCriteria.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No non-technical criteria defined yet.
                </div>
              ) : (
                nonTechCriteria.map((crit) => (
                  <div key={crit.id} className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-3 text-xs">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">{crit.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-purple-300 font-semibold">
                          {crit.teamCategory}
                        </span>
                      </div>
                      <CriteriaDescription description={crit.description} dotColor="bg-purple-400" />
                    </div>
                    <div className="flex items-center gap-3 shrink-0 self-end md:self-start pt-1">
                      {crit.responseType === 'PARAGRAPH' ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium whitespace-nowrap">
                          Written Assessment
                        </span>
                      ) : (
                        <span className="font-mono text-[11px] text-purple-300 whitespace-nowrap font-bold">
                          Scale: {crit.minScore}–{crit.maxScore}
                        </span>
                      )}
                      <button
                        onClick={() => handleEdit(crit)}
                        className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
                        title="Edit criterion"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(crit.id)}
                        className="p-1.5 rounded bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 cursor-pointer"
                        title="Delete criterion"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
