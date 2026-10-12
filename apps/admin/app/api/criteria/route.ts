/**
 * @file criteria/route.ts
 * @brief Dynamic Evaluation Criteria Governance Endpoint.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import {
  listEvaluationCriteria,
  saveEvaluationCriterion,
  deleteEvaluationCriterion,
} from '@/lib/db';

const criterionSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, 'Name is required.'),
  section: z.enum(['GENERAL', 'TECH', 'NON_TECH']),
  teamCategory: z.string().default('ALL'),
  description: z.string().optional(),
  responseType: z.enum(['SCORE', 'PARAGRAPH']).default('SCORE'),
  minScore: z.number().int().min(0).default(1),
  maxScore: z.number().int().max(100).default(10),
  orderIndex: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export async function GET() {
  try {
    const criteria = await listEvaluationCriteria();
    return NextResponse.json({ success: true, criteria });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const parsed = criterionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const saved = await saveEvaluationCriterion(parsed.data);
    return NextResponse.json({ success: true, criterion: saved });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Criterion ID required.' }, { status: 400 });
    }

    await deleteEvaluationCriterion(id);
    return NextResponse.json({ success: true, message: 'Criterion removed.' });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
