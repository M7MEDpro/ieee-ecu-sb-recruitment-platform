/**
 * @file emails/templates/route.ts
 * @brief HTML Email Template Governance & Customization Endpoint.
 * @details Supports templates for Interview, Acceptance, Rejection with
 *          placeholders {{name}} and {{team}}.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { listEmailTemplates, updateEmailTemplate } from '@/lib/db';

const updateTemplateSchema = z.object({
  id: z.enum(['INTERVIEW', 'ACCEPTANCE', 'REJECTION']),
  subject: z.string().trim().min(3, 'Subject is required.'),
  bodyHtml: z.string().trim().min(10, 'HTML body must not be empty.'),
});

export async function GET() {
  try {
    await requireAdmin();
    const templates = await listEmailTemplates();
    return NextResponse.json({ success: true, templates });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const parsed = updateTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const updated = await updateEmailTemplate(
      parsed.data.id,
      parsed.data.subject,
      parsed.data.bodyHtml
    );

    return NextResponse.json({ success: true, template: updated });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
