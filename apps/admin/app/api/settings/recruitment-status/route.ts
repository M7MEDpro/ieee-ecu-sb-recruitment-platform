/**
 * @file api/settings/recruitment-status/route.ts
 * @brief Global Recruitment Portal Status (OPEN / CLOSED) Switch.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-21
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getRecruitmentStatus, setRecruitmentStatus } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

export async function GET() {
  try {
    const status = await getRecruitmentStatus();
    return NextResponse.json({ success: true, status }, { headers: noCacheHeaders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: noCacheHeaders });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const { status } = body;

    if (status !== 'OPEN' && status !== 'CLOSED') {
      return NextResponse.json(
        { success: false, error: 'Status must be OPEN or CLOSED.' },
        { status: 400, headers: noCacheHeaders }
      );
    }

    await setRecruitmentStatus(status, admin.name);
    return NextResponse.json({
      success: true,
      message: `Recruitment portal is now ${status}.`,
      status,
    }, { headers: noCacheHeaders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: noCacheHeaders });
  }
}
