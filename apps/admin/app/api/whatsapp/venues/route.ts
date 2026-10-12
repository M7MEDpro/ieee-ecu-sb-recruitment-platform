/**
 * @file whatsapp/venues/route.ts
 * @brief Dynamic Interview Venues & Meeting Links Management Endpoint.
 * @details Governs pool of physical rooms and virtual meeting links.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-20
 */

import { NextResponse } from 'next/server';
import { requireAdmin, requireAuth } from '@/lib/auth';
import { listVenues, saveVenues } from '@/lib/db';

export async function GET() {
  try {
    await requireAuth();
    const venues = await listVenues();
    return NextResponse.json({ success: true, venues });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    if (!Array.isArray(body.venues)) {
      return NextResponse.json({ success: false, error: 'Expected array of venues.' }, { status: 400 });
    }

    await saveVenues(body.venues);
    return NextResponse.json({ success: true, message: 'Venues updated successfully.' });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
