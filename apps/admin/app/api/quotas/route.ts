/**
 * @file api/quotas/route.ts
 * @brief Real-time Committee Target Capacities & Quotas Management Endpoint.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-21
 */

import { NextResponse } from 'next/server';
import { requireAdmin, requireAuth } from '@/lib/auth';
import { TEAMS } from '@ieee-recruitment/shared';
import { getCommitteeQuotas, saveCommitteeQuotas, getSupabase } from '@/lib/db';

export async function GET() {
  try {
    await requireAuth();
    const quotas = await getCommitteeQuotas();
    const sb = getSupabase();

    let decisionsList: Array<{ team_id: string; decision: string }> = [];
    let appTeams: Array<{ team_id: string }> = [];

    if (sb) {
      const [{ data: dList }, { data: atList }] = await Promise.all([
        sb.from('team_decisions').select('team_id, decision'),
        sb.from('applicant_teams').select('team_id'),
      ]);
      decisionsList = dList || [];
      appTeams = atList || [];
    }

    const report = TEAMS.map((team) => {
      const acceptedCount = decisionsList.filter(
        (d) => d.team_id === team.id && d.decision === 'ACCEPTED'
      ).length;
      const waitlistedCount = decisionsList.filter(
        (d) => d.team_id === team.id && d.decision === 'WAITLISTED'
      ).length;
      const totalApplied = appTeams.filter((at) => at.team_id === team.id).length;
      const targetQuota = quotas[team.id] || 15;

      return {
        teamId: team.id,
        teamName: team.name,
        targetQuota,
        acceptedCount,
        waitlistedCount,
        totalApplied,
        percentFilled: Math.round((acceptedCount / targetQuota) * 100),
      };
    });

    return NextResponse.json({ success: true, quotas: report });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const { quotas } = body;

    if (!quotas || typeof quotas !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid quotas payload.' },
        { status: 400 }
      );
    }

    await saveCommitteeQuotas(quotas, admin.name);
    return NextResponse.json({
      success: true,
      message: 'Committee target quotas updated successfully.',
      quotas,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
