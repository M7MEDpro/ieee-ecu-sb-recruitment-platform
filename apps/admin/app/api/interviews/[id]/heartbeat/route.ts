/**
 * @file api/interviews/[id]/heartbeat/route.ts
 * @brief Live Interview Collision Detection & Heartbeat Session Ping.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-21
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { recordInterviewHeartbeat, releaseInterviewHeartbeat } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const interviewId = params.id;

    const result = await recordInterviewHeartbeat(
      interviewId,
      session.userId,
      session.name
    );

    return NextResponse.json({
      success: true,
      collision: result.collision,
      activeInterviewer: result.activeInterviewer,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const interviewId = params.id;

    await releaseInterviewHeartbeat(interviewId, session.userId);
    return NextResponse.json({ success: true, message: 'Heartbeat session released.' });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
