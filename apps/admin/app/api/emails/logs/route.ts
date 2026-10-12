/**
 * @file emails/logs/route.ts
 * @brief Email History & Dedicated Failed Email Queue Query Endpoint.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { listEmailLogs } from '@/lib/db';

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const filterStatus = searchParams.get('status'); // 'FAILED' or null

    let logs = await listEmailLogs();

    if (filterStatus === 'FAILED') {
      logs = logs.filter((l) => l.status === 'FAILED');
    }

    return NextResponse.json({ success: true, logs });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
