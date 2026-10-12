/**
 * @file whatsapp/decision/route.ts
 * @brief Unified Decision WhatsApp Message Generator.
 * @details Evaluates 1st & 2nd committee preferences, combines acceptance/rejection,
 *          resolves group hierarchy links (Family, Tech Mega, Media Mega, Committee links),
 *          and returns the wa.me link for 1-click enter dispatch.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-20
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  getApplicantDetail,
  getWhatsAppGroupLinks,
  listWhatsAppTemplates,
  generateCombinedWhatsAppDecision,
  formatEgyptianPhoneForWhatsApp,
  updateDecisionWhatsappStatus,
} from '@/lib/db';

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { applicantId, action } = body;

    if (!applicantId) {
      return NextResponse.json({ success: false, error: 'Missing applicantId' }, { status: 400 });
    }

    if (action === 'MARK_SENT') {
      const status = body.status === 'NOT_SENT' ? 'NOT_SENT' : 'SENT';
      await updateDecisionWhatsappStatus(applicantId, status, session.name);
      return NextResponse.json({
        success: true,
        message: `Decision WhatsApp status updated to ${status}`,
        status,
      });
    }

    const applicant = await getApplicantDetail(applicantId);
    if (!applicant) {
      return NextResponse.json({ success: false, error: 'Applicant not found' }, { status: 404 });
    }

    const [groupLinks, templates] = await Promise.all([
      getWhatsAppGroupLinks(),
      listWhatsAppTemplates(),
    ]);

    const combinedTmpl = templates.find((t) => t.id === 'COMBINED_DECISION');
    const subTemplates: Record<string, string> = {};
    for (const tmpl of templates) {
      subTemplates[tmpl.id] = tmpl.template;
    }

    // Map committee decisions
    const teamDecisions = (applicant.teams || []).map((t: any) => ({
      teamName: t.name,
      category: t.broadCategory,
      decision: (applicant.decisions?.[t.id] || 'PENDING') as 'ACCEPTED' | 'REJECTED' | 'PENDING',
    }));

    const message = generateCombinedWhatsAppDecision(
      applicant.fullName,
      teamDecisions,
      groupLinks,
      combinedTmpl?.template,
      subTemplates
    );
    const cleanPhone = formatEgyptianPhoneForWhatsApp(applicant.phoneNumber || applicant.phone || '');
    const waUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
      : null;

    return NextResponse.json({
      success: true,
      message,
      phone: cleanPhone,
      waUrl,
      applicantName: applicant.fullName,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
