'use client';

/**
 * @file RulesExplainer.tsx
 * @brief Clean, Modern English Guidelines Banner for Committee Selection & Interview Scheduling.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import React from 'react';
import { CheckCircle2, MessageSquare, Sparkles } from 'lucide-react';

/**
 * @brief Explanatory Card for IEEE Recruitment Committee Rules.
 * @details Visualizes the Max 1 Tech + Max 1 Non-Tech policy with status indicators.
 * @return {JSX.Element} Visual rule explanation banner.
 */
export default function RulesExplainer() {
  return (
    <div className="w-full bg-gradient-to-br from-[#023260]/90 to-[#011c38]/95 border border-[#00a1c0]/30 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4">
      {/* 1. Selection Rules Header */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-2xl bg-[#00a1c0]/20 text-[#00a1c0] flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#00a1c0]/40 shadow-inner">
          <CheckCircle2 size={22} />
        </div>
        <div className="space-y-2 flex-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00a1c0]/15 text-[#00a1c0] text-xs font-bold uppercase tracking-wider border border-[#00a1c0]/20">
            <Sparkles size={13} />
            <span>Committee Rules</span>
          </div>

          <p className="text-sm sm:text-base font-bold text-white leading-relaxed">
            You can choose <span className="text-[#00a1c0]">1 committee</span>, or at most <span className="text-[#00a1c0]">2 committees</span>:
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
            <span className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-[#00a1c0]/20 border border-[#00a1c0]/40 text-[#00a1c0] font-extrabold text-xs sm:text-sm">
              <span className="px-2 py-0.5 rounded-md bg-[#00a1c0]/35 text-white font-black text-xs shadow-sm">1</span>
              <span>Technical Team</span>
            </span>
            <span className="text-slate-400 font-black text-xs sm:text-sm">+</span>
            <span className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-[#D92525]/20 border border-[#D92525]/40 text-red-300 font-extrabold text-xs sm:text-sm">
              <span className="px-2 py-0.5 rounded-md bg-[#D92525]/35 text-white font-black text-xs shadow-sm">1</span>
              <span>Non-Technical Team</span>
            </span>
          </div>

          <p className="text-[11px] sm:text-xs text-slate-400">
            Choosing only 1 committee (Technical or Non-Technical) is completely fine too!
          </p>
        </div>
      </div>

      {/* 2. WhatsApp Schedule Notification */}
      <div className="flex items-center gap-3 bg-black/30 border border-emerald-500/20 rounded-2xl p-4 text-xs sm:text-sm text-slate-200 shadow-inner">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-500/30">
          <MessageSquare size={18} />
        </div>
        <div>
          <span className="font-bold text-white block sm:inline mr-1">
            WhatsApp Notifications:
          </span>
          <span className="text-slate-300">
            Your interview time, meeting link or campus room, and final results will be sent directly to your WhatsApp number.
          </span>
        </div>
      </div>
    </div>
  );
}
