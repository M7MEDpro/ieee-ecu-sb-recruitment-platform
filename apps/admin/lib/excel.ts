/**
 * @file excel.ts
 * @brief Comprehensive Recruitment Excel Spreadsheet Generator for IEEE ECU SB.
 * @details Exports applicants, interview records, section averages, individual criteria scores,
 *          evaluator notes, review status, and team acceptance/rejection decisions into
 *          a clean, professional, multi-sheet .xlsx workbook.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import * as XLSX from 'xlsx';
import { EvaluationCriterion, formatTimeTo12h } from '@ieee-recruitment/shared';

export function generateRecruitmentExcel(
  applicantsData: any[],
  criteriaList: EvaluationCriterion[] = []
): Buffer {
  // Sort criteria: GENERAL (HR) first, then TECH, then NON_TECH, ordered by orderIndex
  const sectionPriority: Record<string, number> = { GENERAL: 1, TECH: 2, NON_TECH: 3 };
  const sortedCriteria = [...criteriaList].sort((a, b) => {
    const secDiff = (sectionPriority[a.section] || 99) - (sectionPriority[b.section] || 99);
    if (secDiff !== 0) return secDiff;
    return (a.orderIndex || 0) - (b.orderIndex || 0);
  });

  const rows = applicantsData.map((app, index) => {
    const appliedTeamNames = app.teams?.map((t: any) => t.name).join(' & ') || 'N/A';

    // Format decisions
    const decisionEntries = Object.entries(app.decisions || {})
      .map(([teamId, dec]) => `${teamId}: ${dec}`)
      .join(', ');

    // Extract Evaluation & Scores
    const evalData = app.evaluation;
    const scoresMap: Record<string, number> = evalData?.scores || {};
    const textResponsesMap: Record<string, string> = evalData?.textResponses || {};

    const generalAvg =
      evalData?.generalAverage !== null && evalData?.generalAverage !== undefined
        ? Number(evalData.generalAverage)
        : app.generalAverage !== null && app.generalAverage !== undefined
        ? Number(app.generalAverage)
        : null;

    const techAvg =
      evalData?.techAverage !== null && evalData?.techAverage !== undefined
        ? Number(evalData.techAverage)
        : app.techAverage !== null && app.techAverage !== undefined
        ? Number(app.techAverage)
        : null;

    const nonTechAvg =
      evalData?.nonTechAverage !== null && evalData?.nonTechAverage !== undefined
        ? Number(evalData.nonTechAverage)
        : app.nonTechAverage !== null && app.nonTechAverage !== undefined
        ? Number(app.nonTechAverage)
        : null;

    const activeAverages = [generalAvg, techAvg, nonTechAvg].filter(
      (v): v is number => v !== null && !isNaN(v)
    );
    const overallAvg =
      activeAverages.length > 0
        ? Math.round(
            (activeAverages.reduce((acc, curr) => acc + curr, 0) / activeAverages.length) * 10
          ) / 10
        : null;

    // Base applicant row
    const rowObj: Record<string, any> = {
      '#': index + 1,
      'Full Name': app.fullName || '',
      'Phone Number': app.phoneNumber || '',
      'Email Address': app.email || 'N/A',
      'National ID': app.nationalId || '',
      'Faculty': app.faculty || 'N/A',
      'Academic Level': app.academicLevel || 'N/A',
      'Applied Committees': appliedTeamNames,
      'Interview Date': app.interview?.date || 'Unscheduled',
      'Interview Time': app.interview ? `${formatTimeTo12h(app.interview.startTime)} – ${formatTimeTo12h(app.interview.endTime)}` : 'Unscheduled',
      'Assigned HR': app.interview?.hrName || 'Unassigned',
      'Assigned Head(s)': app.interview?.assignedHeads?.join(', ') || 'Unassigned',
      'Interview Status': app.interview?.status || (app.interviewSchedule?.status || 'UNSCHEDULED'),
      'Evaluation Status': evalData ? 'Evaluated' : (app.evaluationStatus || 'Pending'),
      'Overall Score': overallAvg !== null ? overallAvg : 'N/A',
      'General (HR) Score': generalAvg !== null ? generalAvg : 'N/A',
      'Tech Score': techAvg !== null ? techAvg : 'N/A',
      'Non-Tech Score': nonTechAvg !== null ? nonTechAvg : 'N/A',
    };

    // Append dynamic criteria score columns
    for (const crit of sortedCriteria) {
      const sectionTag =
        crit.section === 'GENERAL'
          ? 'HR'
          : crit.section === 'TECH'
          ? `Tech:${(crit.teamCategory || 'ALL').toUpperCase()}`
          : `NonTech:${(crit.teamCategory || 'ALL').toUpperCase()}`;

      const colHeader = `[${sectionTag}] ${crit.name}`;

      if (crit.responseType === 'PARAGRAPH') {
        rowObj[colHeader] = textResponsesMap[crit.id] || '—';
      } else {
        const val = scoresMap[crit.id];
        rowObj[colHeader] = val !== undefined && val !== null ? Number(val) : '—';
      }
    }

    // Append notes
    rowObj['General / HR Notes'] = evalData?.generalNotes?.trim() || '—';
    rowObj['Technical Notes'] = evalData?.techNotes?.trim() || '—';
    rowObj['Non-Technical Notes'] = evalData?.nonTechNotes?.trim() || '—';

    // Governance & Status
    rowObj['Reviewed Status'] = app.isReviewed ? 'Reviewed' : 'Unreviewed';
    rowObj['Team Decisions'] = decisionEntries || 'Pending';
    rowObj['WhatsApp Status'] = app.decisionWhatsappStatus || 'NOT_SENT';
    rowObj['Submission Date'] = app.createdAt || 'N/A';

    return rowObj;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Auto-calculate column widths
  if (rows.length > 0) {
    const headers = Object.keys(rows[0]);
    worksheet['!cols'] = headers.map((key) => {
      let maxLen = key.length;
      for (let i = 0; i < Math.min(rows.length, 50); i++) {
        const valStr = String(rows[i][key] ?? '');
        if (valStr.length > maxLen) maxLen = valStr.length;
      }
      return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
    });
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Applicants & Scores');

  // Sheet 2: Evaluation Rubric Guide
  if (sortedCriteria.length > 0) {
    const criteriaRows = sortedCriteria.map((c, i) => ({
      '#': i + 1,
      'Criterion Name': c.name,
      'Section': c.section === 'GENERAL' ? 'General HR' : c.section === 'TECH' ? 'Technical' : 'Non-Technical',
      'Team Category': c.teamCategory || 'ALL',
      'Type': c.responseType || 'SCORE',
      'Max Score': c.responseType === 'PARAGRAPH' ? 'N/A' : (c.maxScore ?? 10),
      'Description / Rubric': c.description || '—',
    }));
    const criteriaSheet = XLSX.utils.json_to_sheet(criteriaRows);
    criteriaSheet['!cols'] = [
      { wch: 4 },
      { wch: 30 },
      { wch: 15 },
      { wch: 18 },
      { wch: 10 },
      { wch: 10 },
      { wch: 45 },
    ];
    XLSX.utils.book_append_sheet(workbook, criteriaSheet, 'Criteria Rubric');
  }

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
