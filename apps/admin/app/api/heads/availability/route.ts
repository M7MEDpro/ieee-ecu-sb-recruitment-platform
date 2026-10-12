/**
 * @file heads/availability/route.ts
 * @brief Head Availability Configuration Endpoint.
 * @details Covers Tech Head pool, Media Head pool, PR Head, Events Head, and HR Head.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { listHeadAvailability, saveHeadAvailability } from '@/lib/db';

export async function GET() {
  try {
    await requireAdmin();
    const windows = await listHeadAvailability();
    return NextResponse.json({ success: true, windows });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    if (!Array.isArray(body.windows)) {
      return NextResponse.json({ success: false, error: 'Expected array of windows.' }, { status: 400 });
    }

    await saveHeadAvailability(body.windows);
    return NextResponse.json({ success: true, message: 'Head availability windows saved.' });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
