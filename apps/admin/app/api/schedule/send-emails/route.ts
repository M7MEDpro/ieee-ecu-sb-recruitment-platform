/**
 * @file schedule/send-emails/route.ts
 * @brief Legacy Email Dispatch Route (Deprecated - Replaced by WhatsApp Direct).
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-20
 */

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Email dispatch is fully disabled. All interview scheduling notifications are routed directly via 1-click WhatsApp links in the Timeline Studio.',
    },
    { status: 410 }
  );
}
