/**
 * @file export/excel/route.ts
 * @brief Recruitment Data Excel Spreadsheet Export Endpoint with Detailed Scores & Rubrics.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { listApplicants, getApplicantDetail, logAudit, listEvaluationCriteria } from '@/lib/db';
import { generateRecruitmentExcel } from '@/lib/excel';

export async function GET() {
  try {
    const admin = await requireAdmin();

    const [summaryList, criteria] = await Promise.all([
      listApplicants(),
      listEvaluationCriteria(),
    ]);

    // Batch parallel fetching (chunks of 20) to avoid N+1 serial waterfall
    const BATCH_SIZE = 20;
    const detailedList: any[] = [];
    for (let i = 0; i < summaryList.length; i += BATCH_SIZE) {
      const batch = summaryList.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (app) => {
          const detail = await getApplicantDetail(app.id);
          return detail || app;
        })
      );
      detailedList.push(...results);
    }

    const excelBuffer = generateRecruitmentExcel(detailedList, criteria);

    logAudit('ADMIN', admin.name, 'EXPORT_EXCEL_DATA', {
      applicantCount: detailedList.length,
      criteriaCount: criteria.length,
    });

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `IEEE_ECU_SB_Recruitment_${timestamp}.xlsx`;

    return new NextResponse(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
