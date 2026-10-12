/**
 * @file emails/retry/route.ts
 * @brief Dedicated Failed Email Retry Execution Endpoint.
 * @details Retains delivery history, attempts redelivery, and updates attempt counts.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { listEmailLogs, listEmailTemplates, logAudit } from '@/lib/db';
import { sendEmailWithLog } from '@/lib/mailer';

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { logId } = body;

    if (!logId) {
      return NextResponse.json({ success: false, error: 'logId is required.' }, { status: 400 });
    }

    const allLogs = await listEmailLogs();
    const targetLog = allLogs.find((l) => l.id === logId);
    if (!targetLog) {
      return NextResponse.json({ success: false, error: 'Email log record not found.' }, { status: 404 });
    }

    const templates = await listEmailTemplates();
    const templateId =
      targetLog.emailType === 'INTERVIEW_INVITATION'
        ? 'INTERVIEW'
        : targetLog.emailType === 'ACCEPTANCE'
        ? 'ACCEPTANCE'
        : 'REJECTION';

    const tmpl = templates.find((t) => t.id === templateId);
    const bodyHtml = tmpl ? tmpl.bodyHtml : '<p>Recruitment notification from IEEE ECU SB.</p>';

    // Retry delivery
    const result = await sendEmailWithLog({
      recipientEmail: targetLog.recipientEmail,
      applicantId: targetLog.applicantId,
      applicantName: targetLog.applicantName || 'Applicant',
      emailType: targetLog.emailType,
      teamName: targetLog.teamName || '',
      subject: targetLog.subject,
      bodyHtml,
    });

    logAudit('ADMIN', 'Executive Administrator', 'RETRY_FAILED_EMAIL', {
      logId,
      recipient: targetLog.recipientEmail,
      status: result.status,
    });

    return NextResponse.json({
      success: true,
      message:
        result.status === 'SENT'
          ? 'Email redelivered successfully.'
          : 'Email retry attempted but failed again.',
      log: result,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
