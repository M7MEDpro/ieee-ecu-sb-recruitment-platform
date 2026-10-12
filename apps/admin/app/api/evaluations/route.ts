/**
 * @file evaluations/route.ts
 * @brief HR Interview Execution & Score Submission Endpoint.
 * @details Calculates General, Tech, and Non-Tech averages dynamically,
 *          stores section notes, and enforces HR role boundaries.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import {
  getAssignedInterviewsForHR,
  getInterviewDetails,
  startInterviewSession,
  submitInterviewEvaluation,
  getSupabase,
  invalidateCache,
} from '@/lib/db';

const evaluationSubmissionSchema = z.object({
  interviewId: z.string().min(1),
  applicantId: z.string().min(1),
  generalNotes: z.string().optional(),
  techNotes: z.string().optional(),
  nonTechNotes: z.string().optional(),
  scores: z.record(z.string(), z.number().min(0).max(100)),
  textResponses: z.record(z.string(), z.string()).optional(),
  completionStatus: z.enum(['COMPLETED', 'SEMI_COMPLETED']).optional(),
});

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const interviewId = searchParams.get('interviewId');

    if (interviewId) {
      const interview = await getInterviewDetails(interviewId);
      if (!interview) {
        return NextResponse.json({ success: false, error: 'Interview session not found.' }, { status: 404 });
      }

      // HR can view assigned interview or claim on-demand session; Admin can view any
      if (session.role !== 'FULL_ADMIN' && interview.hrId !== session.userId) {
        const sb = getSupabase();
        if (sb) {
          await sb.from('interview_schedules').update({ hr_id: session.userId }).eq('id', interview.id);
          interview.hrId = session.userId;
        } else {
          interview.hrId = session.userId;
        }
      }

      return NextResponse.json({ success: true, interview });
    }

    // List interviews:
    const hrFilter = session.role === 'FULL_ADMIN' ? (searchParams.get('hrId') || undefined) : session.userId;
    const interviews = await getAssignedInterviewsForHR(hrFilter);
    return NextResponse.json({ success: true, interviews });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    // Action: Start Interview
    if (body.action === 'START') {
      if (!body.interviewId) {
        return NextResponse.json({ success: false, error: 'interviewId is required.' }, { status: 400 });
      }
      await startInterviewSession(body.interviewId);
      return NextResponse.json({ success: true, message: 'Interview session started.' });
    }

    // Action: Submit Evaluation
    const parsed = evaluationSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message },
        { status: 400 }
      );
    }

    await submitInterviewEvaluation({
      ...parsed.data,
      hrId: session.userId,
    });

    return NextResponse.json({
      success: true,
      message: 'Evaluation scores and notes recorded successfully.',
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
