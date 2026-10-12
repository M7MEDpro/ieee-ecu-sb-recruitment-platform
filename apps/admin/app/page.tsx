/**
 * @file page.tsx
 * @brief Root Domain Gateway & Role Dispatcher.
 * @details Resolves the authenticated session state and routes clients to the appropriate portal.
 * @author IEEE ECU Student Branch
 */

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function IndexPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.role === 'FULL_ADMIN') {
    redirect('/admin/dashboard');
  }

  redirect('/hr');
}
