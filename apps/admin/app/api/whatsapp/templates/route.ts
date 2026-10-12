/**
 * @file whatsapp/templates/route.ts
 * @brief Customizable WhatsApp Notification Templates Endpoint.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-20
 */

import { NextResponse } from 'next/server';
import { requireAdmin, requireAuth } from '@/lib/auth';
import { listWhatsAppTemplates, saveWhatsAppTemplates } from '@/lib/db';

export async function GET() {
  try {
    await requireAuth();
    const templates = await listWhatsAppTemplates();
    return NextResponse.json({ success: true, templates });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    if (!Array.isArray(body.templates)) {
      return NextResponse.json({ success: false, error: 'Expected array of templates.' }, { status: 400 });
    }

    await saveWhatsAppTemplates(body.templates);
    return NextResponse.json({ success: true, message: 'WhatsApp templates saved successfully.' });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
