'use client';

/**
 * @file login/page.tsx
 * @brief Secure Authentication Portal for Administrators and HR Interviewers.
 * @details Handles credential input, password toggles, server authentication exchange,
 *          and role-aware routing between executive dashboard and HR interview queue.
 * @author IEEE ECU Student Branch
 */
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Lock, User, AlertCircle, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed.');
      }

      if (data.user?.role === 'FULL_ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/hr');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 relative overflow-hidden bg-transparent">
      {/* Styles to fix browser autofill from ruining dark theme */}
      <style jsx global>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #021226 inset !important;
          -webkit-text-fill-color: #ffffff !important;
          caret-color: #ffffff !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>

      {/* Subtle Central Cosmic Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-[500px] h-80 sm:h-[500px] bg-[#D92525]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full bg-slate-950/75 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.7)] backdrop-blur-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2.5">
          {/* Chinese University Subtitle */}
          <div className="flex items-center gap-2 justify-center">
            <span className="w-4 h-px bg-[#D92525]" />
            <span className="text-[10px] font-bold text-[#D92525] tracking-[0.25em] uppercase">
              埃及中国大学 • IEEE ECU SB
            </span>
            <span className="w-4 h-px bg-[#D92525]" />
          </div>

          <div className="relative w-48 h-12 mx-auto drop-shadow-md">
            <Image
              src="/assets/logo/logo_white.png"
              alt="IEEE ECU SB Logo"
              fill
              sizes="192px"
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Portal Authentication
          </h1>
          <p className="text-xs text-slate-400">
            Sign in with your Admin or HR credentials to access the recruitment studio.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-950/80 border border-red-500/40 rounded-xl p-3.5 flex items-start gap-3 text-xs text-red-200 animate-in fade-in">
            <AlertCircle size={16} className="text-[#D92525] flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <User size={13} className="text-[#D92525]" />
              <span>Username</span>
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter your username"
              className="w-full bg-slate-900/80 border border-white/10 focus:border-[#D92525] focus:ring-1 focus:ring-[#D92525]/30 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Lock size={13} className="text-[#D92525]" />
              <span>Password</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900/80 border border-white/10 focus:border-[#D92525] focus:ring-1 focus:ring-[#D92525]/30 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-slate-500 outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-1"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 rounded-xl bg-[#D92525] hover:bg-[#b81e1e] text-white font-bold text-sm shadow-lg shadow-red-950/40 transition flex items-center justify-center gap-2 disabled:opacity-50 border border-red-500/30"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In to Portal</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
