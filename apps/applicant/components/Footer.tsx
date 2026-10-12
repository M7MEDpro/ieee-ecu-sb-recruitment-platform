'use client';

/**
 * @file Footer.tsx
 * @brief Clean, Minimal Footer for IEEE ECU SB Recruitment Portal.
 * @details Minimal copyright and attribution without visual clutter. Strictly excludes LinkedIn.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import React from 'react';
import { Heart } from 'lucide-react';

/**
 * @brief Global Footer Component for Applicant Portal.
 * @return {JSX.Element} Minimal footer displaying IEEE ECU SB copyright and branding.
 */
export default function Footer() {
  return (
    <footer className="w-full bg-[#011c38]/90 border-t border-white/10 text-slate-400 py-4 px-4 text-center text-xs">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>© {new Date().getFullYear()} IEEE ECU Student Branch. All rights reserved.</p>
        <p className="flex items-center justify-center gap-1 text-[11px] text-slate-500">
          Egyptian Chinese University • Inspiring Innovation
        </p>
      </div>
    </footer>
  );
}
