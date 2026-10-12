/**
 * @file emails/send-results/route.ts
 * @brief Legacy Email Result Dispatch Route (Deprecated - Replaced by WhatsApp Direct).
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-20
 */

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Email dispatch is fully disabled. All acceptance/rejection decisions are dispatched as unified WhatsApp messages with hierarchical group links.',
    },
    { status: 410 }
  );
}
