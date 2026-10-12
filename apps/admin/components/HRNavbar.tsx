'use client';

/**
 * @file HRNavbar.tsx
 * @brief Distraction-Free Navigation Header for Assigned HR Interviewers.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LogOut, UserCheck } from 'lucide-react';

/**
 * @brief Interview Header Navigation Bar for HR Members.
 * @param {HRNavbarProps} props Current evaluator name, active room, and status callbacks.
 * @return {JSX.Element} Navigation bar tailored for live interviewers.
 */
export default function HRNavbar({ hrName = 'HR Officer' }: { hrName?: string }) {
  const router = useRouter();

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to sign out from the HR Portal?')) return;
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#011c38]/95 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-md">
      <Link href="/hr" className="flex items-center gap-3 group transition-opacity hover:opacity-90">
        <div className="relative w-12 h-9 flex-shrink-0 drop-shadow-[0_2px_8px_rgba(255,255,255,0.25)]">
          <Image
            src="/assets/logo/logo_white.png"
            alt="IEEE ECU SB Logo"
            fill
            sizes="48px"
            className="object-contain"
          />
        </div>
        <div>
          <h1 className="font-extrabold text-sm sm:text-base text-white tracking-wide uppercase group-hover:text-[#00a1c0] transition-colors">
            IEEE ECU SB
          </h1>
          <span className="text-[10px] sm:text-xs text-slate-300 font-semibold tracking-wider uppercase block">
            HR Portal
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-200">
          <UserCheck size={14} className="text-[#00a1c0]" />
          <span>Assigned: <strong>{hrName}</strong></span>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-400 text-xs font-semibold transition"
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}
