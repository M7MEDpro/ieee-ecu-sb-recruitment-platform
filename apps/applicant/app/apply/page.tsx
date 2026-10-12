'use client';

/**
 * @file apply/page.tsx
 * @brief Interactive Application Form View for Candidates with Open/Closed Gateway.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Lock, Loader2, ExternalLink } from 'lucide-react';
import ApplicationForm from '@/components/ApplicationForm';
import { IEEE_BRANDING } from '@ieee-recruitment/shared';

const STATUS_CACHE_KEY = 'ieee_recruitment_portal_status';

export default function ApplyPage() {
  const [recruitmentStatus, setRecruitmentStatus] = useState<'OPEN' | 'CLOSED' | 'LOADING'>('LOADING');

  useEffect(() => {
    let isMounted = true;
    let hasCached = false;
    try {
      const cached = localStorage.getItem(STATUS_CACHE_KEY);
      if (cached === 'OPEN' || cached === 'CLOSED') {
        hasCached = true;
        setRecruitmentStatus(cached);
      }
    } catch {}

    fetch('/api/status', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          const liveStatus = data?.status === 'CLOSED' ? 'CLOSED' : 'OPEN';
          setRecruitmentStatus(liveStatus);
          try {
            localStorage.setItem(STATUS_CACHE_KEY, liveStatus);
          } catch {}
        }
      })
      .catch(() => {
        if (isMounted && !hasCached) {
          setRecruitmentStatus('OPEN');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (recruitmentStatus === 'LOADING') {
    return (
      <div className="w-full min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <Loader2 size={32} className="mx-auto animate-spin text-[#00a1c0]" />
          <p className="text-xs text-slate-400 font-mono">Checking recruitment status...</p>
        </div>
      </div>
    );
  }

  if (recruitmentStatus === 'CLOSED') {
    return (
      <div className="w-full min-h-screen py-12 sm:py-20 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-xl w-full bg-[#022344]/90 border border-white/10 rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-2xl backdrop-blur-md">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <Lock size={32} />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] font-bold">
              <Clock size={12} />
              <span>Recruitment Period Concluded</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Applications are Currently Closed
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-1">
              Thank you for your interest in IEEE Egyptian Chinese University Student Branch. The submission window for Season 2026-2027 is now officially closed.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 text-xs text-slate-400 text-left space-y-2">
            <div className="font-semibold text-white">What happens next?</div>
            <p>
              Candidates who submitted their forms are undergoing committee evaluation and interview scheduling.
              If you have already applied, keep an eye on your WhatsApp messages for your interview invitation.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-bold text-slate-200 hover:text-white transition flex items-center justify-center gap-2"
            >
              <ArrowLeft size={14} />
              <span>Back to Home</span>
            </Link>
            <a
              href={IEEE_BRANDING.links.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#00a1c0] hover:brightness-110 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow"
            >
              <span>Follow Official Updates</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen py-8 sm:py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            <span>Return to Home</span>
          </Link>
        </div>

        {/* Page Title */}
        <div className="space-y-2 relative">
          <div className="flex items-center gap-2">
            <span className="w-4 h-px bg-[#D92525]" />
            <span className="text-[10px] font-bold text-[#ff5b5b] uppercase tracking-[0.2em]">
              Egyptian Chinese University - IEEE ECU SB Season 2026-2027
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Official Recruitment Application
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Please fill in your authentic details. Applications are processed by the HR evaluation committee.
          </p>
        </div>

        {/* Form Component */}
        <ApplicationForm />
      </div>
    </div>
  );
}
