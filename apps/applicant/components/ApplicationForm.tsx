'use client';

/**
 * @file ApplicationForm.tsx
 * @brief Mobile-First High-Integrity Application Form for IEEE ECU SB Recruitment.
 * @details Implements client-side pre-validation, live National ID parsing,
 *          clear team selection rules, anti-tampering, and atomic submission.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Phone,
  Mail,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Layers,
  ChevronDown,
  FileCheck,
  ShieldCheck,
  X,
  Check,
  Lock,
} from 'lucide-react';
import {
  TECH_TEAMS,
  NON_TECH_TEAMS,
  TeamDefinition,
  validateEgyptianNationalId,
  validateTeamSelection,
  validateEgyptianPhoneNumber,
  ECU_FACULTIES,
  ACADEMIC_LEVELS,
} from '@ieee-recruitment/shared';
import TeamCard from './TeamCard';
import RulesExplainer from './RulesExplainer';

/**
 * @brief Multi-Step Applicant Submission Form Component.
 * @details Validates demographic data, enforces Egyptian National ID checks,
 *          processes committee choices, and delivers atomic submission payloads.
 * @return {JSX.Element} Complete registration form interface.
 */
export default function ApplicationForm() {
  const router = useRouter();

  // Input Refs for auto-scroll and focus on validation error
  const fullNameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const nationalIdRef = useRef<HTMLInputElement>(null);
  const facultyRef = useRef<HTMLSelectElement>(null);
  const academicLevelRef = useRef<HTMLSelectElement>(null);
  const teamsRef = useRef<HTMLDivElement>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [faculty, setFaculty] = useState('');
  const [academicLevel, setAcademicLevel] = useState('');

  // Selected Teams
  const [selectedTechTeam, setSelectedTechTeam] = useState<TeamDefinition | null>(null);
  const [selectedNonTechTeam, setSelectedNonTechTeam] = useState<TeamDefinition | null>(null);

  // Status & Errors
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isClosed, setIsClosed] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    fetch('/api/status')
      .then((r) => r.json())
      .then((d) => {
        if (d?.status === 'CLOSED') {
          setIsClosed(true);
          setSubmitError('Applications are currently closed for IEEE ECU Recruitment 2026–2027.');
        }
      })
      .catch(() => {});
  }, []);

  // Live National ID Feedback
  const nationalIdAnalysis = useMemo(() => {
    if (!nationalId.trim()) return null;
    return validateEgyptianNationalId(nationalId);
  }, [nationalId]);

  // Live Phone Number Feedback
  const phoneAnalysis = useMemo(() => {
    if (!phoneNumber.trim()) return null;
    return validateEgyptianPhoneNumber(phoneNumber);
  }, [phoneNumber]);

  // Combined selected IDs
  const currentSelectedTeamIds = useMemo(() => {
    const ids: string[] = [];
    if (selectedTechTeam) ids.push(selectedTechTeam.id);
    if (selectedNonTechTeam) ids.push(selectedNonTechTeam.id);
    return ids;
  }, [selectedTechTeam, selectedNonTechTeam]);

  // Handlers for team selection
  const handleToggleTechTeam = (team: TeamDefinition) => {
    if (selectedTechTeam?.id === team.id) {
      setSelectedTechTeam(null);
    } else {
      setSelectedTechTeam(team);
    }
  };

  const handleToggleNonTechTeam = (team: TeamDefinition) => {
    if (selectedNonTechTeam?.id === team.id) {
      setSelectedNonTechTeam(null);
    } else {
      setSelectedNonTechTeam(team);
    }
  };

  // Smooth validation and pre-submit review
  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validate Full Name
    if (!fullName.trim() || fullName.trim().split(/\s+/).length < 2) {
      setTouched((prev) => ({ ...prev, fullName: true }));
      setSubmitError('Please enter your full name (at least first and last name).');
      fullNameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      fullNameRef.current?.focus();
      return;
    }

    // Validate Phone Number
    const phoneVal = validateEgyptianPhoneNumber(phoneNumber);
    if (!phoneVal.isValid) {
      setTouched((prev) => ({ ...prev, phoneNumber: true }));
      setSubmitError(phoneVal.errorMessage || 'Invalid Egyptian phone number (11 digits starting with 010, 011, 012, or 015).');
      phoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      phoneRef.current?.focus();
      return;
    }

    // Validate Email Address (Required)
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setTouched((prev) => ({ ...prev, email: true }));
      setSubmitError('Please enter a valid email address (e.g. name@example.com).');
      emailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      emailRef.current?.focus();
      return;
    }

    // Validate National ID
    const idValidation = validateEgyptianNationalId(nationalId);
    if (!idValidation.isValid) {
      setSubmitError(idValidation.errorMessage || 'Invalid Egyptian National ID (14 digits).');
      nationalIdRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      nationalIdRef.current?.focus();
      return;
    }

    // Validate Faculty
    if (!faculty) {
      setSubmitError('Please select your Faculty / College.');
      facultyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      facultyRef.current?.focus();
      return;
    }

    // Validate Academic Level
    if (!academicLevel) {
      setSubmitError('Please select your Academic Level (as on your University ID).');
      academicLevelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      academicLevelRef.current?.focus();
      return;
    }

    // Validate Team Selection
    const teamValidation = validateTeamSelection(currentSelectedTeamIds);
    if (!teamValidation.isValid) {
      setSubmitError(teamValidation.errorMessage || 'Please select at least 1 committee.');
      teamsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // All validations passed -> Open Confirmation Modal
    setShowConfirmModal(true);
  };

  // Final permanent atomic submission
  const executeFinalSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim(),
          email: email.trim(),
          nationalId: nationalId.trim(),
          faculty,
          academicLevel,
          selectedTeamIds: currentSelectedTeamIds,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Application submission failed.');
      }

      // Store success session in both sessionStorage and localStorage for reliable /success view & printing
      if (typeof window !== 'undefined') {
        const successPayload = JSON.stringify({
          applicantId: data.applicantId,
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim(),
          email: email.trim(),
          nationalId: nationalId.trim(),
          faculty: faculty.trim(),
          academicLevel: academicLevel.trim(),
          teams: data.selectedTeams,
          createdAt: data.createdAt || new Date().toISOString(),
        });
        try {
          sessionStorage.setItem('ieee_recruitment_success', successPayload);
        } catch (e) {
          console.warn('Failed to save to sessionStorage', e);
        }
        try {
          localStorage.setItem('ieee_recruitment_success', successPayload);
        } catch (e) {
          console.warn('Failed to save to localStorage', e);
        }
      }

      router.push('/success');
    } catch (err: any) {
      console.error('Submission error:', err);
      setSubmitError(err.message || 'An unexpected error occurred. Please try again.');
      setShowConfirmModal(false);
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handlePreSubmit} className="w-full max-w-4xl mx-auto space-y-8">
      {/* 1. Personal Information Section */}
      <div className="bg-gradient-to-br from-[#023260]/60 to-[#011c38]/80 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-xl">
        <div className="border-b border-white/10 pb-4">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
            <User className="text-[#00a1c0]" size={24} />
            Applicant Information
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Please enter your contact details and student information.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              Full Name <span className="text-[#D92525]">*</span>
            </label>
            <div className="relative">
              <input
                ref={fullNameRef}
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, fullName: true }))}
                placeholder="e.g. Mohamed Ahmed Badawy"
                className="w-full bg-black/30 border border-white/15 focus:border-[#00a1c0] focus:ring-1 focus:ring-[#00a1c0] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition"
              />
            </div>
            {touched.fullName && fullName.trim().split(/\s+/).length < 2 && (
              <p className="text-[11px] text-amber-400">
                Please enter at least your first and last name.
              </p>
            )}
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                Phone Number (WhatsApp Active) <span className="text-[#D92525]">*</span>
              </span>
              {phoneNumber.length > 0 && (
                <span className="text-[10px] font-mono text-slate-400">
                  {phoneNumber.length}/11 digits
                </span>
              )}
            </label>
            <div className="relative">
              <input
                ref={phoneRef}
                type="tel"
                required
                maxLength={11}
                value={phoneNumber}
                onChange={(e) => {
                  let raw = e.target.value;
                  let cleaned = raw.replace(/[\s\-\(\)\.]/g, '');
                  if (cleaned.startsWith('+20')) cleaned = '0' + cleaned.slice(3);
                  else if (cleaned.startsWith('0020')) cleaned = '0' + cleaned.slice(4);
                  else if (cleaned.startsWith('20') && cleaned.length >= 11) cleaned = '0' + cleaned.slice(2);
                  const digitsOnly = cleaned.replace(/\D/g, '').slice(0, 11);
                  setPhoneNumber(digitsOnly);
                }}
                onBlur={() => setTouched((prev) => ({ ...prev, phoneNumber: true }))}
                placeholder="01xxxxxxxxx (e.g. 01012345678)"
                className={`w-full bg-black/30 border rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition font-mono ${
                  phoneNumber.length === 11 && phoneAnalysis?.isValid
                    ? 'border-emerald-500/60 focus:ring-1 focus:ring-emerald-500'
                    : phoneNumber.length > 0 && !phoneAnalysis?.isValid
                    ? 'border-amber-500/50 focus:ring-1 focus:ring-amber-500'
                    : 'border-white/15 focus:border-[#00a1c0] focus:ring-1 focus:ring-[#00a1c0]'
                }`}
              />
            </div>

            {/* Live Visual Phone Validation Feedback */}
            {phoneNumber.length > 0 && (
              <div className="text-[11px] pt-0.5">
                {phoneAnalysis?.isValid ? (
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                      <span>Valid Egyptian phone number</span>
                    </span>
                    {phoneAnalysis.network && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                        {phoneAnalysis.network}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-amber-400 flex items-start gap-1">
                    <AlertCircle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      {!phoneNumber.startsWith('0')
                        ? 'Phone number must start with 0 (e.g. 010, 011, 012, or 015).'
                        : !/^(010|011|012|015)/.test(phoneNumber)
                        ? 'Must start with a valid Egyptian network prefix: 010, 011, 012, or 015.'
                        : `Please enter 11 digits (${phoneNumber.length}/11 entered).`}
                    </span>
                  </div>
                )}
              </div>
            )}
            {!phoneNumber && touched.phoneNumber && (
              <p className="text-[11px] text-rose-400">
                Phone number is required (11 digits starting with 010, 011, 012, or 015).
              </p>
            )}
            <p className="text-[11px] text-emerald-400/90 font-medium">
              Must have active WhatsApp. All interview dates, links, and selection results will be sent here.
            </p>
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                Email Address <span className="text-[#D92525]">*</span>
              </label>
            </div>
            <div className="relative">
              <input
                ref={emailRef}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                placeholder="e.g. your.name@example.com"
                className={`w-full bg-black/30 border rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition ${
                  touched.email && (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
                    ? 'border-amber-500/50 focus:ring-1 focus:ring-amber-500'
                    : email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
                    ? 'border-emerald-500/60 focus:ring-1 focus:ring-emerald-500'
                    : 'border-white/15 focus:border-[#00a1c0] focus:ring-1 focus:ring-[#00a1c0]'
                }`}
              />
            </div>
            {touched.email && !email.trim() && (
              <p className="text-[11px] text-rose-400">
                Email address is required for official registration records.
              </p>
            )}
            {touched.email && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && (
              <p className="text-[11px] text-amber-400">
                Please enter a valid email address (e.g. name@example.com).
              </p>
            )}
            <p className="text-[11px] text-slate-400">
              Required for registration. (Note: Interview dates and final results will be sent to your WhatsApp number).
            </p>
          </div>

          {/* National ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              National ID <span className="text-[#D92525]">*</span>
            </label>
            <div className="relative">
              <input
                ref={nationalIdRef}
                type="text"
                required
                maxLength={14}
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
                placeholder="14 numeric digits"
                className="w-full bg-black/30 border border-white/15 focus:border-[#00a1c0] focus:ring-1 focus:ring-[#00a1c0] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition tracking-wider font-mono"
              />
            </div>

            {/* Live National ID Verification Feedback */}
            {nationalId.length > 0 && (
              <div className="text-[11px] pt-1">
                {nationalIdAnalysis?.isValid ? (
                  <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <CheckCircle2 size={13} />
                    <span>
                      Verified: {nationalIdAnalysis.governorate} • {nationalIdAnalysis.gender}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <AlertCircle size={13} />
                    <span>{nationalIdAnalysis?.errorMessage || '14 digits required.'}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Faculty / College */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              Faculty / College <span className="text-[#D92525]">*</span>
            </label>
            <div className="relative">
              <select
                ref={facultyRef}
                required
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
                className="w-full bg-black/30 border border-white/15 focus:border-[#00a1c0] focus:ring-1 focus:ring-[#00a1c0] rounded-xl px-4 py-3 text-sm text-white outline-none transition appearance-none cursor-pointer"
              >
                <option value="" disabled className="bg-slate-900 text-slate-400">
                  Select your Faculty...
                </option>
                {ECU_FACULTIES.map((f) => (
                  <option key={f.id} value={f.nameEn} className="bg-slate-900 text-white">
                    {f.nameEn}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                <ChevronDown size={16} />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Egyptian Chinese University (ECU) faculties.
            </p>
          </div>

          {/* Academic Level */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              Academic Level <span className="text-[#D92525]">*</span>
            </label>
            <div className="relative">
              <select
                ref={academicLevelRef}
                required
                value={academicLevel}
                onChange={(e) => setAcademicLevel(e.target.value)}
                className="w-full bg-black/30 border border-white/15 focus:border-[#00a1c0] focus:ring-1 focus:ring-[#00a1c0] rounded-xl px-4 py-3 text-sm text-white outline-none transition appearance-none cursor-pointer"
              >
                <option value="" disabled className="bg-slate-900 text-slate-400">
                  Select your Level (1 - 7)...
                </option>
                {ACADEMIC_LEVELS.map((lvl) => (
                  <option key={lvl.id} value={lvl.label} className="bg-slate-900 text-white">
                    {lvl.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                <ChevronDown size={16} />
              </div>
            </div>
            <p className="text-[11px] text-cyan-400/90 font-medium">
              * As printed on your official University Student ID card.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Rules Explainer Banner - Moved AFTER Basic Info per user request */}
      <RulesExplainer />

      {/* 3. Team Selection Section */}
      <div ref={teamsRef} className="bg-gradient-to-br from-[#023260]/60 to-[#011c38]/80 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-8 backdrop-blur-xl">
        <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
              <Layers className="text-[#00a1c0]" size={24} />
              Choose Your Committees
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Select up to 1 Tech team and up to 1 Non-Tech team. (Minimum 1 total).
            </p>
          </div>

          {/* Current Selection Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-xs px-3 py-1 rounded-full border ${
                selectedTechTeam
                  ? 'bg-[#00a1c0]/20 text-[#00a1c0] border-[#00a1c0]/40 font-bold'
                  : 'bg-white/5 text-slate-400 border-white/10'
              }`}
            >
              Tech: {selectedTechTeam ? selectedTechTeam.name : 'None'}
            </span>
            <span
              className={`text-xs px-3 py-1 rounded-full border ${
                selectedNonTechTeam
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold'
                  : 'bg-white/5 text-slate-400 border-white/10'
              }`}
            >
              Non-Tech: {selectedNonTechTeam ? selectedNonTechTeam.name : 'None'}
            </span>
          </div>
        </div>

        {/* Group A: TECH TEAMS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm sm:text-base text-white tracking-wide uppercase flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00a1c0]" />
              Technical Committees (Choose Maximum 1)
            </h3>
            {selectedTechTeam && (
              <button
                type="button"
                onClick={() => setSelectedTechTeam(null)}
                className="text-xs text-slate-400 hover:text-white underline"
              >
                Clear Tech selection
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {TECH_TEAMS.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                isSelected={selectedTechTeam?.id === team.id}
                onSelect={handleToggleTechTeam}
              />
            ))}
          </div>
        </div>

        {/* Group B: NON-TECH TEAMS (Operations & Media) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm sm:text-base text-white tracking-wide uppercase flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D92525]" />
              Non-Technical Committees (Choose Maximum 1)
            </h3>
            {selectedNonTechTeam && (
              <button
                type="button"
                onClick={() => setSelectedNonTechTeam(null)}
                className="text-xs text-slate-400 hover:text-white underline"
              >
                Clear Non-Tech selection
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {NON_TECH_TEAMS.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                isSelected={selectedNonTechTeam?.id === team.id}
                onSelect={handleToggleNonTechTeam}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Submission Error / Closed Banner */}
      {submitError && (
        <div className="bg-gradient-to-r from-red-950/90 via-[#350a0a]/95 to-red-950/90 border-2 border-red-500/70 rounded-3xl p-6 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left shadow-2xl shadow-red-950/80 animate-in fade-in">
          <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center shrink-0">
            <Lock size={22} />
          </div>
          <div className="space-y-1">
            <div className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">
              {submitError.toLowerCase().includes('closed') ? 'Form is Closed' : 'Submission Blocked'}
            </div>
            <p className="text-xs sm:text-sm text-red-200/90 font-medium leading-relaxed">
              {submitError}
            </p>
          </div>
        </div>
      )}

      {/* 4. Submission CTA */}
      <div className="pt-2 flex flex-col items-center justify-center space-y-3">
        <button
          type="submit"
          disabled={submitting || currentSelectedTeamIds.length === 0 || isClosed || (submitError?.toLowerCase().includes('closed') ?? false)}
          className={`w-full sm:w-auto min-w-[280px] px-8 py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-2xl transition-all duration-300 ${
            submitting || currentSelectedTeamIds.length === 0 || isClosed || (submitError?.toLowerCase().includes('closed') ?? false)
              ? 'bg-slate-700/80 text-slate-400 cursor-not-allowed border border-white/10'
              : 'bg-gradient-to-r from-[#D92525] to-[#b91c1c] hover:brightness-110 text-white shadow-xl shadow-red-900/40 hover:scale-[1.02] active:scale-[0.98] border border-red-400/20'
          }`}
        >
          {isClosed || (submitError?.toLowerCase().includes('closed') ?? false) ? (
            <>
              <Lock size={18} />
              <span>Form is Closed</span>
            </>
          ) : (
            <>
              <FileCheck size={18} />
              <span>Review & Submit Application</span>
            </>
          )}
        </button>

        <p className="text-xs text-slate-400 text-center max-w-md">
          {isClosed
            ? 'Applications are officially closed. Submissions cannot be accepted.'
            : 'You will have a chance to review all your information before final recording.'}
        </p>
      </div>

      {/* 5. Pre-Submission Review & Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[#021f3d] border border-white/15 rounded-3xl max-w-lg w-full p-5 sm:p-7 space-y-5 shadow-2xl shadow-black/90 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#00a1c0]/20 border border-[#00a1c0]/40 text-[#00a1c0] flex items-center justify-center shrink-0">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Review Before Submitting</h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Please review your details carefully before submitting.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Candidate Summary */}
            <div className="bg-black/40 rounded-2xl p-4 border border-white/10 space-y-3 text-xs">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-slate-400">Full Name:</span>
                <span className="font-bold text-white text-sm">{fullName}</span>
              </div>

              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-slate-400">WhatsApp Phone:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">{phoneNumber}</span>
              </div>

              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-slate-400">Email Address:</span>
                <span className="font-mono font-medium text-white truncate max-w-[220px]">
                  {email.trim()}
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-slate-400">National ID:</span>
                <span className="font-mono font-bold text-white">{nationalId}</span>
              </div>

              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-slate-400">Faculty & Level:</span>
                <span className="font-medium text-slate-200 text-right">{faculty} • {academicLevel}</span>
              </div>

              <div className="pt-1 space-y-1.5">
                <span className="text-slate-400 block font-semibold">Chosen Committees:</span>
                <div className="flex flex-wrap gap-2">
                  {selectedTechTeam && (
                    <span className="px-2.5 py-1 rounded-lg bg-[#00a1c0]/20 text-[#00a1c0] border border-[#00a1c0]/30 font-bold text-xs">
                      Tech: {selectedTechTeam.name}
                    </span>
                  )}
                  {selectedNonTechTeam && (
                    <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold text-xs">
                      Non-Tech: {selectedNonTechTeam.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Warning Note */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-200 flex items-start gap-2">
              <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Please Note:</strong> Make sure your details are correct. Once submitted, you cannot edit them. All interview invitations and decisions will be sent directly to your WhatsApp number.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold transition text-center"
              >
                Edit Details
              </button>

              <button
                type="button"
                onClick={executeFinalSubmit}
                disabled={submitting}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#D92525] to-[#b91c1c] hover:brightness-110 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-900/40 transition active:scale-95 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Submitting Application...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Confirm & Submit Application</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
