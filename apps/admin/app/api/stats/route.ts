/**
 * @file stats/route.ts
 * @brief Dashboard Metrics & Operational Analytics Endpoint.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDashboardStats } from '@/lib/db';

export async function GET() {
  try {
    await requireAdmin();
    const stats = await getDashboardStats();
    return NextResponse.json({ success: true, stats });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
