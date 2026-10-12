'use client';

/**
 * @file Navbar.tsx
 * @brief Clean Navigation Header for IEEE ECU SB Recruitment Portal.
 * @details Minimal header showing branch branding and quick links, completely
 *          free of mobile hamburger menus or redundant buttons.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { IEEE_BRANDING } from '@ieee-recruitment/shared';

function FacebookIcon({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <defs>
        <linearGradient id="nav-ig-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f09433" />
          <stop offset="25%" stopColor="#e6683c" />
          <stop offset="50%" stopColor="#dc2743" />
          <stop offset="75%" stopColor="#cc2366" />
          <stop offset="100%" stopColor="#bc1888" />
        </linearGradient>
      </defs>
      <path
        fill="url(#nav-ig-gradient)"
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
      />
    </svg>
  );
}

/**
 * @file Navbar.tsx
 * @brief Brand Header & Navigation Bar.
 * @return {JSX.Element} Rendered navigation header.
 */
export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full pointer-events-none px-3.5 sm:px-6 lg:px-8 pt-[max(0.75rem,env(safe-area-inset-top,0.75rem))] pb-2 transition-all print:hidden">
      <div className="max-w-6xl mx-auto rounded-2xl sm:rounded-full bg-[#000818]/70 backdrop-blur-2xl border border-white/20 shadow-[0_16px_50px_rgba(0,0,0,0.6),inset_0_1px_1.5px_rgba(255,255,255,0.25)] px-5 sm:px-8 py-2.5 sm:py-3 pointer-events-auto flex items-center justify-between transition-all">
        {/* Logo & Branch Name */}
        <Link href="/" className="flex items-center gap-3 sm:gap-3.5 group">
          <div className="relative w-[48px] h-[36px] sm:w-[58px] sm:h-[44px] flex-shrink-0 transition-transform duration-300 group-hover:scale-105">
            <Image
              src="/assets/logo/logo_white.png"
              alt="IEEE ECU SB Logo"
              fill
              sizes="(max-width: 640px) 48px, 58px"
              className="object-contain drop-shadow-[0_2px_8px_rgba(255,255,255,0.25)]"
              priority
            />
          </div>
          <span className="font-extrabold text-sm sm:text-base tracking-wider text-white uppercase group-hover:text-[#00a1c0] transition-colors leading-tight">
            IEEE ECU SB
          </span>
        </Link>

        {/* Social Links (Facebook & Instagram) */}
        <nav className="flex items-center gap-2.5 sm:gap-3">
          <a
            href={IEEE_BRANDING.links.facebook}
            target="_blank"
            rel="noopener noreferrer"
            title="Facebook"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-[#1877F2]/30 active:scale-90 border border-white/20 text-white flex items-center justify-center transition-all shadow-sm"
          >
            <FacebookIcon size={17} />
          </a>
          <a
            href={IEEE_BRANDING.links.instagram}
            target="_blank"
            rel="noopener noreferrer"
            title="Instagram"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-pink-500/30 active:scale-90 border border-white/20 text-white flex items-center justify-center transition-all shadow-sm"
          >
            <InstagramIcon size={17} />
          </a>
        </nav>
      </div>
    </header>
  );
}
