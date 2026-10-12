/**
 * @file whatsapp/links/route.ts
 * @brief WhatsApp Group Links Configuration Endpoint.
 * @details Governs hierarchical group links: Family group, Tech Mega group,
 *          Media Mega group, and per-committee invite links.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-20
 */

import { NextResponse } from 'next/server';
import { requireAdmin, requireAuth } from '@/lib/auth';
import { getWhatsAppGroupLinks, saveWhatsAppGroupLinks } from '@/lib/db';

export async function GET() {
  try {
    await requireAuth();
    const links = await getWhatsAppGroupLinks();
    return NextResponse.json({ success: true, links });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    if (!body.links) {
      return NextResponse.json({ success: false, error: 'Missing links data.' }, { status: 400 });
    }

    await saveWhatsAppGroupLinks(body.links);
    return NextResponse.json({ success: true, message: 'WhatsApp group links saved successfully.' });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
