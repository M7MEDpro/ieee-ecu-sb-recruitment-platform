/**
 * @file applicants/[id]/decision/route.ts
 * @brief Team-Specific Independent Acceptance/Rejection Decision Endpoint.
 * @details Strictly validates that the decision is made for an applied team only.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { setTeamDecision } from '@/lib/db';

const decisionSchema = z.object({
  teamId: z.string().min(1, 'teamId is required.'),
  decision: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'WAITLISTED']),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const parsed = decisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message },
        { status: 400 }
      );
    }

    await setTeamDecision(
      params.id,
      parsed.data.teamId,
      parsed.data.decision,
      admin.name
    );

    return NextResponse.json({
      success: true,
      message: `Committee decision recorded: ${parsed.data.decision}`,
      teamId: parsed.data.teamId,
      decision: parsed.data.decision,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
