/**
 * @file layout.tsx
 * @brief Admin Control Center Layout Wrapper.
 * @details Enforces full administrator role-based authentication, mounts the responsive navigation drawer,
 *          and establishes the unified content viewport boundaries.
 * @author IEEE ECU Student Branch
 */

import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import AdminSidebar from '@/components/AdminSidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== 'FULL_ADMIN') {
    redirect('/login');
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full max-w-full bg-transparent">
      <AdminSidebar />
      <main className="flex-1 w-full max-w-full min-w-0 overflow-x-hidden p-3.5 sm:p-6 lg:p-8 pb-24 lg:pb-8">
        {children}
      </main>
    </div>
  );
}
