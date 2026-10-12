/**
 * @file api/status/route.ts
 * @brief Public Recruitment Open/Closed Status Probe.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-21
 */

import { NextResponse } from 'next/server';
import { getRecruitmentStatus } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
    'CDN-Cache-Control': 'no-store',
    'Vercel-CDN-Cache-Control': 'no-store',
  };

  try {
    const status = await getRecruitmentStatus();
    return NextResponse.json({ success: true, status }, { headers });
  } catch (err: any) {
    return NextResponse.json({ success: true, status: 'OPEN' }, { headers });
  }
}
