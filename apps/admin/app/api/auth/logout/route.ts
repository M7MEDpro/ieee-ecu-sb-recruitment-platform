/**
 * @file logout/route.ts
 * @brief Session Termination Endpoint.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import { NextResponse } from 'next/server';
import { clearSessionCookie, getSession } from '@/lib/auth';
import { logAudit } from '@/lib/db';

export async function POST() {
  const session = await getSession();
  if (session) {
    logAudit(session.role === 'FULL_ADMIN' ? 'ADMIN' : 'HR', session.name, 'LOGOUT');
  }
  clearSessionCookie();
  return NextResponse.json({ success: true, message: 'Logged out successfully.' });
}
