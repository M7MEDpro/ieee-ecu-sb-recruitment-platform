'use client';

/**
 * @file success/page.tsx
 * @brief Application Confirmation & Guidance Screen for Successful Submissions.
 * @details Implements dual-storage persistence (sessionStorage + localStorage fallback)
 *          and dedicated, pixel-perfect print layout for official registration receipts.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Calendar,
  Copy,
  Check,
  Printer,
  Home,
  AlertCircle,
  FileText,
  Clock,
  Phone,
  Mail,
  GraduationCap,
  ShieldCheck,
  User,
} from 'lucide-react';
import { ECU_FACULTIES, ACADEMIC_LEVELS } from '@ieee-recruitment/shared';

interface SubmittedApplicantSession {
  applicantId: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  nationalId?: string;
  faculty?: string;
  academicLevel?: string;
  teams?: Array<{
    id: string;
    name: string;
    category?: string;
  }>;
  createdAt?: string;
}

export default function SuccessPage() {
  const [sessionData, setSessionData] = useState<SubmittedApplicantSession | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [formattedDate, setFormattedDate] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let raw = sessionStorage.getItem('ieee_recruitment_success');
      if (!raw) {
        raw = localStorage.getItem('ieee_recruitment_success');
      }

      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setSessionData(parsed);
          if (parsed.createdAt) {
            try {
              const d = new Date(parsed.createdAt);
              setFormattedDate(
                d.toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              );
            } catch {
              setFormattedDate(parsed.createdAt);
            }
          }
        } catch (e) {
          console.error('Failed to parse recruitment session data:', e);
        }
      }
      setIsLoaded(true);
    }
  }, []);

  const handleCopyId = async () => {
    if (!sessionData?.applicantId) return;
    try {
      await navigator.clipboard.writeText(sessionData.applicantId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const facultyLabel =
    ECU_FACULTIES.find((f) => f.id === sessionData?.faculty || f.nameEn === sessionData?.faculty)?.nameEn ||
    sessionData?.faculty ||
    'Egyptian Chinese University';

  const academicLevelLabel =
    ACADEMIC_LEVELS.find((l) => l.id === sessionData?.academicLevel)?.label ||
    sessionData?.academicLevel ||
    'Undergraduate';

  return (
    <div className="w-full min-h-[85vh] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      {/* ══════════════════════════════════════════════════════════════
          1. INTERACTIVE SCREEN VIEW (Hidden During Browser Printing)
         ══════════════════════════════════════════════════════════════ */}
      <div className="print:hidden max-w-xl mx-auto space-y-6">
        {!isLoaded ? (
          <div className="w-full bg-[#001233]/70 border border-white/10 rounded-3xl p-12 text-center text-slate-400 animate-pulse">
            Loading confirmation details...
          </div>
        ) : !sessionData ? (
          <div className="bg-[#001233]/80 border border-amber-500/30 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-2xl text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
              <AlertCircle size={32} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              No Application Session Found
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              We couldn&apos;t detect a recently completed application in your browser session. If you have already applied, your record is safely preserved in our database.
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#00a1c0] hover:bg-[#008ba6] text-white font-bold text-xs transition"
              >
                <Home size={14} />
                <span>Go to Recruitment Form</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-[#023260]/80 to-[#011c38]/90 border border-white/15 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Animated Check Icon */}
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 size={42} strokeWidth={2.5} />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                Application Received!
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                Thank You, {sessionData.fullName || 'Applicant'}!
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                Your application for <strong className="text-white">IEEE ECU Student Branch</strong> has been successfully received! We&apos;re excited to learn more about you.
              </p>
            </div>

            {/* Submitted Information Card */}
            <div className="bg-black/35 rounded-2xl p-4 sm:p-5 border border-white/10 text-left space-y-3 text-xs sm:text-sm">
              {sessionData.applicantId && (
                <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
                  <span className="text-slate-400">Application Reference ID:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-emerald-400 font-bold text-xs">
                      {sessionData.applicantId.slice(0, 13)}...
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition flex items-center gap-1 text-[11px]"
                      title="Copy full application ID"
                    >
                      {copiedId ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedId ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              )}

              {sessionData.nationalId && (
                <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
                  <span className="text-slate-400">National ID:</span>
                  <span className="font-mono text-slate-200">{sessionData.nationalId}</span>
                </div>
              )}

              {sessionData.faculty && (
                <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
                  <span className="text-slate-400">Faculty & Level:</span>
                  <span className="font-medium text-slate-200 text-right">
                    {facultyLabel} • {academicLevelLabel}
                  </span>
                </div>
              )}

              {sessionData.phoneNumber && (
                <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
                  <span className="text-slate-400">WhatsApp Phone:</span>
                  <span className="font-semibold text-emerald-400 font-mono flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {sessionData.phoneNumber}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
                <span className="text-slate-400">Registered Email:</span>
                <span className="font-semibold text-white break-all text-right">
                  {sessionData.email || 'Registered'}
                </span>
              </div>

              {formattedDate && (
                <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
                  <span className="text-slate-400">Submitted At:</span>
                  <span className="text-slate-300 text-right font-mono text-[11px]">
                    {formattedDate}
                  </span>
                </div>
              )}

              <div className="space-y-1.5 pt-1">
                <span className="text-slate-400 block">Applied Committees:</span>
                <div className="flex flex-wrap gap-2">
                  {sessionData.teams?.map((t) => (
                    <span
                      key={t.id}
                      className="px-3 py-1 rounded-full text-xs font-bold bg-[#00a1c0]/20 text-[#00a1c0] border border-[#00a1c0]/30"
                    >
                      {t.name} ({t.category === 'TECH' ? 'Tech' : 'Non-Tech'})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Next Steps Guidance */}
            <div className="bg-[#00a1c0]/10 border border-[#00a1c0]/25 rounded-2xl p-4 text-left space-y-2.5 text-xs sm:text-sm text-slate-200">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <Calendar size={18} className="text-[#00a1c0]" />
                What Happens Next?
              </div>
              <ul className="space-y-2 pl-5 list-disc text-slate-300 text-xs">
                <li>
                  <strong>One Interview:</strong> Even if you chose two committees, you will have <strong>only one interview</strong> covering both.
                </li>
                <li>
                  <strong>WhatsApp Invitation:</strong> When your interview is scheduled, you will receive a WhatsApp message with the exact date, time, and location or Google Meet link. Please keep your WhatsApp active.
                </li>
                <li>
                  <strong>You&apos;re All Set:</strong> Your application has been saved. There is nothing more you need to do right now!
                </li>
              </ul>
            </div>

            {/* Action Controls */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handlePrint}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2 border border-white/10 shadow-md active:scale-95"
              >
                <Printer size={15} />
                <span>Print / Save Receipt</span>
              </button>

              <Link
                href="/"
                className="w-full sm:w-auto px-8 py-3 rounded-full bg-[#00a1c0] hover:bg-[#008ba6] text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-[#00a1c0]/25 hover:scale-105 active:scale-95"
              >
                <Home size={15} />
                <span>Return to Home</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          2. DEDICATED OFFICIAL PRINT RECEIPT (Only Rendered In Print)
         ══════════════════════════════════════════════════════════════ */}
      <div className="hidden print:block w-full max-w-2xl mx-auto bg-white text-slate-900 font-sans">
        {sessionData ? (
          <div className="border-2 border-slate-900 rounded-lg p-6 bg-white space-y-5 text-slate-900">
            {/* Header: University & Branch Info */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <h1 className="text-xl font-extrabold tracking-wider text-slate-900 uppercase">
                  IEEE ECU STUDENT BRANCH
                </h1>
                <p className="text-xs font-semibold text-slate-700 tracking-wide mt-0.5">
                  The Egyptian Chinese University • 埃及中国大学
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  Official Recruitment Portal • Season 2026–2027
                </p>
              </div>

              <div className="text-right border-2 border-emerald-700 bg-emerald-50 text-emerald-900 px-3 py-1.5 rounded">
                <span className="text-[11px] font-extrabold tracking-wider block text-emerald-800">
                  ✓ OFFICIALLY REGISTERED
                </span>
                <span className="font-mono text-[10px] text-slate-600 block mt-0.5 font-bold">
                  REF: {sessionData.applicantId?.slice(0, 16)}
                </span>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center space-y-0.5 py-1">
              <h2 className="text-base font-extrabold uppercase tracking-widest text-slate-900">
                Application Registration Receipt
              </h2>
              <p className="text-[11px] text-slate-600">
                Official electronic proof of application ingestion
              </p>
            </div>

            {/* Applicant Information Table */}
            <table className="w-full border-collapse border border-slate-300 text-xs">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="w-1/4 p-2 bg-slate-100 font-bold text-slate-700 border-r border-slate-200">
                    Full Name:
                  </td>
                  <td className="w-1/4 p-2 font-bold text-slate-900 border-r border-slate-200">
                    {sessionData.fullName || '—'}
                  </td>
                  <td className="w-1/4 p-2 bg-slate-100 font-bold text-slate-700 border-r border-slate-200">
                    Reference ID:
                  </td>
                  <td className="w-1/4 p-2 font-mono font-bold text-slate-900 break-all text-[11px]">
                    {sessionData.applicantId || '—'}
                  </td>
                </tr>

                <tr className="border-b border-slate-200">
                  <td className="p-2 bg-slate-100 font-bold text-slate-700 border-r border-slate-200">
                    Egyptian National ID:
                  </td>
                  <td className="p-2 font-mono text-slate-900 border-r border-slate-200">
                    {sessionData.nationalId || 'Provided at registration'}
                  </td>
                  <td className="p-2 bg-slate-100 font-bold text-slate-700 border-r border-slate-200">
                    Registered Email:
                  </td>
                  <td className="p-2 text-slate-900 break-all border-slate-200">
                    {sessionData.email || '—'}
                  </td>
                </tr>

                <tr className="border-b border-slate-200">
                  <td className="p-2 bg-slate-100 font-bold text-slate-700 border-r border-slate-200">
                    Faculty:
                  </td>
                  <td className="p-2 text-slate-900 border-r border-slate-200">
                    {facultyLabel}
                  </td>
                  <td className="p-2 bg-slate-100 font-bold text-slate-700 border-r border-slate-200">
                    Academic Level:
                  </td>
                  <td className="p-2 text-slate-900 border-slate-200">
                    {academicLevelLabel}
                  </td>
                </tr>

                <tr className="border-b border-slate-200">
                  <td className="p-2 bg-slate-100 font-bold text-slate-700 border-r border-slate-200">
                    WhatsApp Phone:
                  </td>
                  <td className="p-2 font-mono font-bold text-emerald-800 border-r border-slate-200">
                    {sessionData.phoneNumber || '—'}
                  </td>
                  <td className="p-2 bg-slate-100 font-bold text-slate-700 border-r border-slate-200">
                    Registration Date:
                  </td>
                  <td className="p-2 font-mono text-slate-900 text-[11px]">
                    {formattedDate || sessionData.createdAt || 'Current Cycle'}
                  </td>
                </tr>

                <tr>
                  <td className="p-2 bg-slate-100 font-bold text-slate-700 border-r border-slate-200 align-top">
                    Applied Committee(s):
                  </td>
                  <td colSpan={3} className="p-2 font-semibold text-slate-900">
                    {sessionData.teams && sessionData.teams.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {sessionData.teams.map((t, idx) => (
                          <span
                            key={t.id}
                            className="inline-block px-2.5 py-1 bg-slate-100 border border-slate-300 rounded text-slate-800 text-[11px]"
                          >
                            {idx + 1}. {t.name} ({t.category === 'TECH' ? 'Technical' : 'Non-Technical'})
                          </span>
                        ))}
                      </div>
                    ) : (
                      'Recruitment Committee Selection Recorded'
                    )}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Official Guidance & Next Steps */}
            <div className="border border-slate-300 bg-slate-50 p-4 rounded text-xs text-slate-800 space-y-2">
              <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                Important Candidate Interview Instructions:
              </div>
              <ul className="space-y-1.5 list-disc pl-5 text-[11px] leading-relaxed text-slate-700">
                <li>
                  <strong>One Combined Interview:</strong> Even if you selected two committees, you will attend <strong>only ONE combined interview</strong> covering all preferences.
                </li>
                <li>
                  <strong>WhatsApp Communication:</strong> Your official interview date, time slot, and venue (or Google Meet link) will be dispatched directly to your registered WhatsApp number (<strong>{sessionData.phoneNumber}</strong>). Please keep WhatsApp notifications active.
                </li>
                <li>
                  <strong>Candidate Verification:</strong> Please keep this receipt or your Reference ID (<strong>{sessionData.applicantId}</strong>) accessible when attending your interview.
                </li>
              </ul>
            </div>

            {/* Footer Verification Notice */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-300 text-[10px] text-slate-500">
              <div className="space-y-0.5">
                <div>IEEE ECU Student Branch Recruitment Database System</div>
                <div>Electronic verification code: {sessionData.applicantId}</div>
              </div>
              <div className="text-right font-bold text-slate-700">
                <div>RECRUITMENT COMMITTEE 2026–2027</div>
                <div>THE EGYPTIAN CHINESE UNIVERSITY</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 border border-slate-300 rounded text-center text-xs text-slate-500">
            No application data loaded in current session. Visit https://ieee-ecu-applicant.vercel.app to apply.
          </div>
        )}
      </div>
    </div>
  );
}
