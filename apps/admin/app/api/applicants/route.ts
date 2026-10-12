/**
 * @file applicants/route.ts
 * @brief Applicant Directory Query Endpoint with Multi-Criteria Filtering.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listApplicants } from '@/lib/db';

export async function GET(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);

    const query = (searchParams.get('q') || '').trim().toLowerCase();
    const filterStatus = searchParams.get('filter') || 'ALL'; // ALL, UNREVIEWED, REVIEWED, TECH, NON_TECH, BOTH, ACCEPTED, REJECTED
    const teamFilter = searchParams.get('team') || 'ALL';

    let applicants = await listApplicants();

    // 0. Team Filter
    if (teamFilter && teamFilter !== 'ALL') {
      applicants = applicants.filter((a) =>
        (a.teams || []).some((t) => t.id === teamFilter || t.name.toLowerCase() === teamFilter.toLowerCase())
      );
    }

    // 1. Text Search Filter (Name, Email, Phone, National ID)
    if (query) {
      applicants = applicants.filter((a) => {
        return (
          a.fullName.toLowerCase().includes(query) ||
          (a.email && a.email.toLowerCase().includes(query)) ||
          (a.phoneNumber && a.phoneNumber.includes(query)) ||
          (a.nationalId && a.nationalId.includes(query))
        );
      });
    }

    // 2. Status Filters
    if (filterStatus === 'UNREVIEWED') {
      applicants = applicants.filter((a) => !a.isReviewed);
    } else if (filterStatus === 'REVIEWED') {
      applicants = applicants.filter((a) => a.isReviewed);
    } else if (filterStatus === 'TECH') {
      applicants = applicants.filter(
        (a) => a.teams.some((t) => t.broadCategory === 'TECH') && !a.teams.some((t) => t.broadCategory === 'NON_TECH')
      );
    } else if (filterStatus === 'NON_TECH') {
      applicants = applicants.filter(
        (a) => a.teams.some((t) => t.broadCategory === 'NON_TECH') && !a.teams.some((t) => t.broadCategory === 'TECH')
      );
    } else if (filterStatus === 'BOTH') {
      applicants = applicants.filter(
        (a) => a.teams.some((t) => t.broadCategory === 'TECH') && a.teams.some((t) => t.broadCategory === 'NON_TECH')
      );
    } else if (filterStatus === 'ACCEPTED') {
      applicants = applicants.filter((a) =>
        Object.values(a.decisions || {}).includes('ACCEPTED')
      );
    } else if (filterStatus === 'REJECTED') {
      applicants = applicants.filter((a) =>
        Object.values(a.decisions || {}).includes('REJECTED')
      );
    } else if (filterStatus === 'WAITLISTED') {
      applicants = applicants.filter((a) =>
        Object.values(a.decisions || {}).includes('WAITLISTED')
      );
    } else if (filterStatus === 'PENDING_WA') {
      applicants = applicants.filter((a) =>
        a.isReviewed && a.decisionWhatsappStatus !== 'SENT'
      );
    } else if (filterStatus === 'NO_SHOW') {
      applicants = applicants.filter((a) =>
        a.interviewStatus === 'NO_SHOW'
      );
    }

    return NextResponse.json({
      success: true,
      count: applicants.length,
      applicants,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
