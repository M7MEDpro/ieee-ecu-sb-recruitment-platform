'use client';

/**
 * @file AdminSidebar.tsx
 * @brief High-Performance, Lightweight Navigation Sidebar for Admin Portal.
 * @details Optimized for zero layout shift, instant transitions, and minimal DOM overhead.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-19
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Calendar,
  UserCog,
  Clock,
  Sliders,
  FileText,
  LogOut,
  Menu,
  X,
  MessageSquare,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Applicants', href: '/admin/applicants', icon: Users },
  { label: 'Scheduling & Timeline', href: '/admin/scheduling', icon: Calendar },
  { label: 'WhatsApp & Groups', href: '/admin/whatsapp', icon: MessageSquare },
  { label: 'HR Management', href: '/admin/hr-management', icon: UserCog },
  { label: 'Head Availability', href: '/admin/head-availability', icon: Clock },
  { label: 'Evaluation Criteria', href: '/admin/criteria', icon: Sliders },
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: FileText },
];

/**
 * @brief Responsive Administrative Navigation Sidebar Component.
 * @details Handles desktop persistent sidebar navigation and mobile responsive slide-out drawer.
 * @return {JSX.Element} Rendered sidebar component.
 */
export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentNavItem = NAV_ITEMS.find((item) => pathname?.startsWith(item.href));

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  // Automatically close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to log out from the Admin Portal?')) return;
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (e) {
      router.push('/login');
    }
  };

  const navLinks = (
    <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 active:scale-[0.98] ${
              isActive
                ? 'bg-[#00a1c0]/15 text-[#00a1c0] font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Icon
              size={19}
              className={`flex-shrink-0 ${isActive ? 'text-[#00a1c0]' : 'text-slate-400'}`}
            />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <div
        className="lg:hidden w-full shrink-0 sticky top-0 z-40 bg-[#000814]/90 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl bg-white/5 text-white hover:bg-white/10 border border-white/10 active:scale-95 transition flex items-center justify-center"
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/assets/logo/logo_white.png"
              alt="IEEE Logo"
              className="w-7 h-auto object-contain flex-shrink-0"
            />
            <div className="min-w-0">
              <span className="font-black text-xs text-white block truncate uppercase tracking-wide">
                IEEE ECU SB
              </span>
              {currentNavItem && (
                <span className="text-[11px] text-[#00a1c0] font-bold block truncate">
                  {currentNavItem.label}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition"
          aria-label="Log out"
        >
          <LogOut size={18} />
        </button>
      </div>

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 h-screen fixed top-0 left-0 bottom-0 z-30 flex-shrink-0 flex-col bg-[#000814]/90 backdrop-blur-2xl border-r border-white/10 text-slate-300 select-none">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center gap-3">
          <img
            src="/assets/logo/logo_white.png"
            alt="IEEE ECU SB Logo"
            className="w-10 h-auto object-contain"
          />
          <div>
            <h2 className="font-extrabold text-sm text-white tracking-wide uppercase">
              IEEE ECU SB
            </h2>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase block">
              Admin Portal
            </span>
          </div>
        </div>

        {/* Links */}
        {navLinks}

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/20 flex items-center justify-between">
          <div>
            <p className="font-bold text-white text-xs">Administrator</p>
            <p className="text-[10px] text-emerald-400 font-medium">Full Access Role</p>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-400 transition-colors duration-150"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar Spacer to preserve flex flow and layout geometry */}
      <div className="hidden lg:block w-64 flex-shrink-0" aria-hidden="true" />

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full bg-[#000814]/95 backdrop-blur-2xl border-r border-white/10 flex flex-col z-10 shadow-2xl">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src="/assets/logo/logo_white.png"
                  alt="IEEE ECU SB Logo"
                  className="w-8 h-auto object-contain"
                />
                <span className="font-bold text-sm text-white uppercase">IEEE ECU SB</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={20} />
              </button>
            </div>
            {navLinks}
            <div
              className="p-4 border-t border-white/10 bg-black/20 flex items-center justify-between"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
            >
              <div>
                <p className="font-bold text-white text-xs">Administrator</p>
                <p className="text-[10px] text-emerald-400 font-medium">Full Access</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl bg-white/5 text-slate-300 hover:text-red-400"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#000814]/95 backdrop-blur-2xl border-t border-white/10 px-2 py-1.5 flex items-center justify-around shadow-[0_-8px_25px_rgba(0,0,0,0.6)]"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
      >
        {[
          { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
          { label: 'Applicants', href: '/admin/applicants', icon: Users },
          { label: 'Schedule', href: '/admin/scheduling', icon: Calendar },
          { label: 'WhatsApp', href: '/admin/whatsapp', icon: MessageSquare },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all active:scale-95 ${
                isActive ? 'text-[#00a1c0]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-[#00a1c0]' : 'text-slate-400'} />
              <span className={`text-[10px] mt-0.5 font-semibold ${isActive ? 'font-bold text-white' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-400 hover:text-white transition-all active:scale-95"
          aria-label="Open Full Menu"
        >
          <Menu size={18} className="text-slate-400" />
          <span className="text-[10px] mt-0.5 font-semibold">More</span>
        </button>
      </nav>
    </>
  );
}
