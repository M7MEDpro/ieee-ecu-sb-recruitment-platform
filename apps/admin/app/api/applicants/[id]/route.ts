/**
 * @file applicants/[id]/route.ts
 * @brief Applicant Detailed Record Query Endpoint.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import { NextResponse } from 'next/server';
import { requireAuth, requireAdmin } from '@/lib/auth';
import { getApplicantDetail, deleteApplicant } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const applicant = await getApplicantDetail(params.id);

    if (!applicant) {
      return NextResponse.json({ success: false, error: 'Applicant not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, applicant });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const adminSession = await requireAdmin();
    await deleteApplicant(params.id, adminSession.name);

    return NextResponse.json({
      success: true,
      message: 'Applicant record deleted permanently.',
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
