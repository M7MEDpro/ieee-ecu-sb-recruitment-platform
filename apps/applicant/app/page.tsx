'use client';

/**
 * @file page.tsx
 * @brief Clean, Direct Landing Page for IEEE ECU Student Branch Recruitment.
 * @details Features a prominent "Start your application" CTA with direct
 *          social & website access buttons (Facebook, Instagram, Our Website).
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles, Lock } from 'lucide-react';
import { IEEE_BRANDING } from '@ieee-recruitment/shared';

// Official SVG Icons
function FacebookIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <defs>
        <linearGradient id="hero-ig-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f09433" />
          <stop offset="25%" stopColor="#e6683c" />
          <stop offset="50%" stopColor="#dc2743" />
          <stop offset="75%" stopColor="#cc2366" />
          <stop offset="100%" stopColor="#bc1888" />
        </linearGradient>
      </defs>
      <path
        fill="url(#hero-ig-gradient)"
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
      />
    </svg>
  );
}

const STATUS_CACHE_KEY = 'ieee_recruitment_portal_status';

export default function HomePage() {
  const [status, setStatus] = useState<'OPEN' | 'CLOSED' | null>(null);

  useEffect(() => {
    let cachedVal: 'OPEN' | 'CLOSED' | null = null;
    try {
      const stored = localStorage.getItem(STATUS_CACHE_KEY);
      if (stored === 'OPEN' || stored === 'CLOSED') {
        cachedVal = stored;
        setStatus(stored);
      }
    } catch {}

    fetch('/api/status', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.status === 'OPEN' || data?.status === 'CLOSED') {
          setStatus(data.status);
          try {
            localStorage.setItem(STATUS_CACHE_KEY, data.status);
          } catch {}
        }
      })
      .catch(() => {
        if (!cachedVal) {
          setStatus('OPEN');
        }
      });
  }, []);

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-8 relative overflow-hidden bg-transparent">
      {/* Subtle Central Cosmic Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-[600px] h-80 sm:h-[600px] bg-[#00a1c0]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-xl w-full mx-auto flex flex-col items-center text-center">
        {/* Decorative Chinese University Header Line */}
        <div className="flex items-center gap-2 sm:gap-3 mb-2 animate-in fade-in duration-700">
          <span className="w-6 sm:w-10 h-px bg-[#D92525]" />
          <span className="text-[10px] sm:text-xs font-bold tracking-[0.25em] uppercase text-[#ff5b5b]">
            埃及中国大学 • The Egyptian Chinese University
          </span>
          <span className="w-6 sm:w-10 h-px bg-[#D92525]" />
        </div>

        {/* Branch Logo with Geometric Corner Accents & Atmospheric Halo */}
        <div className="relative p-2 my-2 sm:my-3">
          {/* Ambient Glow Aura */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-[420px] h-48 sm:h-[260px] bg-gradient-to-r from-[#00a1c0]/25 via-blue-600/15 to-[#D92525]/20 rounded-full blur-[60px] pointer-events-none -z-10" />

          <div className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-[#D92525]/60 pointer-events-none" />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-[#00a1c0]/60 pointer-events-none" />

          <div className="relative w-64 h-[154px] sm:w-80 sm:h-[192px] md:w-[380px] md:h-[228px] flex-shrink-0 drop-shadow-[0_6px_32px_rgba(255,255,255,0.3)]">
            <Image
              src="/assets/logo/logo_white.png"
              alt="IEEE ECU SB Logo"
              fill
              sizes="(max-width: 640px) 256px, (max-width: 768px) 320px, 380px"
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Season Badge */}
        <div className="mt-3 sm:mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs sm:text-sm font-semibold text-[#00a1c0] shadow-sm">
          <Sparkles size={15} />
          <span>Recruitment Season 2026-2027</span>
        </div>

        {/* Title and Subtitle */}
        <div className="mt-4 sm:mt-5 space-y-1.5 sm:space-y-2">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
            IEEE ECU Student Branch
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-md mx-auto leading-relaxed">
            Impact to inspire.
          </p>
        </div>

        {/* 1. Primary Action Area: Either "Start your application" or Bold "Form is Closed" */}
        <div className="w-full max-w-md mt-6 sm:mt-8 min-h-[58px] flex items-center justify-center">
          {status === null ? (
            <div className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 animate-pulse flex items-center justify-center">
              <span className="text-xs font-mono text-slate-400">Loading portal status...</span>
            </div>
          ) : status === 'CLOSED' ? (
            <div className="w-full py-5 sm:py-6 px-6 sm:px-8 rounded-3xl bg-gradient-to-b from-red-950/90 via-[#260505]/95 to-red-950/90 border-2 border-red-500/70 shadow-[0_10px_40px_rgba(217,37,37,0.35)] flex flex-col items-center justify-center text-center space-y-2.5 backdrop-blur-xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Top ambient highlight */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-80" />

              {/* Status Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-black uppercase tracking-wider shadow-inner">
                <Lock size={14} className="text-red-400" />
                <span>Submissions Closed</span>
              </div>

              {/* Main Headline - Bold, Big, Clear */}
              <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight drop-shadow-md">
                Form is Closed
              </h2>

              {/* Description */}
              <p className="text-xs sm:text-sm text-red-200/90 font-medium max-w-sm mx-auto leading-relaxed">
                Applications for Season 2026–2027 are officially concluded. Follow our social media channels below for all upcoming announcements!
              </p>
            </div>
          ) : (
            <Link
              href="/apply"
              className="w-full group py-4 px-8 rounded-2xl btn-primary-ieee text-white font-black text-base sm:text-lg flex items-center justify-center gap-3 border border-red-400/30 animate-in fade-in duration-200"
            >
              <span>Start your application</span>
              <ArrowRight size={20} className="group-hover:translate-x-1.5 transition-transform" />
            </Link>
          )}
        </div>

        {/* 2. Two Secondary Buttons: Facebook & Instagram */}
        <div className="w-full max-w-md grid grid-cols-2 gap-3 mt-4 sm:mt-5">
          {/* Facebook */}
          <a
            href={IEEE_BRANDING.links.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="py-3 px-4 rounded-xl bg-[#1877F2]/15 hover:bg-[#1877F2]/25 text-white border border-[#1877F2]/30 hover:border-[#1877F2]/60 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-md shadow-blue-900/20 hover:shadow-blue-600/30"
          >
            <FacebookIcon size={18} className="text-[#1877F2]" />
            <span>Facebook</span>
          </a>

          {/* Instagram */}
          <a
            href={IEEE_BRANDING.links.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="relative p-[1.5px] rounded-xl bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] hover:shadow-lg hover:shadow-pink-600/30 hover:scale-105 active:scale-95 transition-all duration-300 group block"
          >
            <div className="w-full h-full py-[10.5px] px-3.5 rounded-[10.5px] bg-[#02203e] group-hover:bg-[#022548] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors">
              <InstagramIcon size={18} />
              <span>Instagram</span>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
