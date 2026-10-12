/**
 * @file applicants/[id]/review/route.ts
 * @brief Applicant Reviewed Status Toggle Endpoint.
 * @details Separate from acceptance/rejection decisions.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { toggleApplicantReviewed } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin();
    const newState = await toggleApplicantReviewed(params.id, admin.name);

    return NextResponse.json({
      success: true,
      isReviewed: newState,
      message: newState ? 'Marked as reviewed.' : 'Marked as unreviewed.',
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
