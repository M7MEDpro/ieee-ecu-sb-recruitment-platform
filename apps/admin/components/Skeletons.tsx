'use client';

/**
 * @file Skeletons.tsx
 * @brief High-performance, zero-layout-shift UI Skeleton Loaders for Admin & HR Portals.
 * @details Replaces jarring blank spinners with animated pulse shimmer skeletons
 *          that mirror final UI geometry for instant 0ms perceived speed.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-19
 */

import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-white/10 backdrop-blur-sm ${className}`}
    />
  );
}

export function SkeletonMetricsGrid({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${count >= 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="admin-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="w-8 h-8 rounded-lg" />
          </div>
          <div className="flex items-baseline gap-2">
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-2.5 w-32" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTableRows({ rows = 6 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-white/5 animate-pulse">
          {/* Applicant Info */}
          <td className="py-4 px-4 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-2.5 w-44" />
          </td>
          {/* Committees */}
          <td className="py-4 px-4">
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </td>
          {/* Interview Status */}
          <td className="py-4 px-4">
            <Skeleton className="h-6 w-24 rounded-full" />
          </td>
          {/* Scores */}
          <td className="py-4 px-3 text-center">
            <Skeleton className="h-6 w-10 mx-auto rounded" />
          </td>
          <td className="py-4 px-3 text-center">
            <Skeleton className="h-6 w-10 mx-auto rounded" />
          </td>
          <td className="py-4 px-3 text-center">
            <Skeleton className="h-6 w-10 mx-auto rounded" />
          </td>
          {/* Review Decision */}
          <td className="py-4 px-4 text-center">
            <Skeleton className="h-6 w-20 mx-auto rounded-full" />
          </td>
          {/* Actions */}
          <td className="py-4 px-4 text-right">
            <div className="flex items-center justify-end gap-2">
              <Skeleton className="h-7 w-16 rounded-lg" />
              <Skeleton className="h-7 w-7 rounded-lg" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

export function SkeletonList({ items = 4 }: { items?: number }) {
  return (
    <div className="divide-y divide-white/5 rounded-xl bg-black/20 border border-white/10 overflow-hidden">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="p-3.5 flex items-center justify-between text-xs animate-pulse">
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-2.5 w-16" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-24 rounded" />
            <Skeleton className="h-7 w-7 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonScheduleSlots({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="admin-card rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-20 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-2.5 w-48" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonCardGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-6 rounded-3xl border border-white/10 bg-[#022344]/50 space-y-4 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-4 w-12 rounded" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-6 w-3/4 rounded-lg" />
            <Skeleton className="h-3.5 w-1/2 rounded" />
            <Skeleton className="h-3.5 w-2/3 rounded" />
          </div>
          <div className="space-y-1.5 pt-2">
            <Skeleton className="h-3 w-28 rounded" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
          <div className="pt-4 border-t border-white/5 flex items-center justify-between">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonDossier() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6 animate-pulse">
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-4 w-40 rounded" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="admin-card rounded-2xl p-6 space-y-4">
          <Skeleton className="h-5 w-32 rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-3/4 rounded" />
          <Skeleton className="h-4 w-5/6 rounded" />
        </div>
        <div className="md:col-span-2 admin-card rounded-2xl p-6 space-y-4">
          <Skeleton className="h-5 w-40 rounded" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonAuditRows({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-white/5 animate-pulse">
          <td className="px-5 py-4 w-10">
            <Skeleton className="h-4 w-4 rounded" />
          </td>
          <td className="px-5 py-4 w-44">
            <Skeleton className="h-4 w-32 rounded" />
          </td>
          <td className="px-5 py-4 w-40">
            <Skeleton className="h-4 w-24 rounded" />
          </td>
          <td className="px-5 py-4 w-48">
            <Skeleton className="h-5 w-36 rounded-full" />
          </td>
          <td className="px-5 py-4">
            <Skeleton className="h-4 w-60 rounded" />
          </td>
        </tr>
      ))}
    </>
  );
}


