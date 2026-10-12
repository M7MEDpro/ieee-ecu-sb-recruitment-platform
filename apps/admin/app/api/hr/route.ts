/**
 * @file hr/route.ts
 * @brief HR Account Governance Endpoint.
 * @details Privileged endpoint: HR accounts can ONLY be created by Full Admin.
 *          HR accounts contain only Name and Password.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { listHRAccounts, createHRAccount, deleteHRAccount, updateHRAccountPassword } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const createHRSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(60).refine(
    (val) => !val.toLowerCase().includes('amar'),
    { message: 'Cannot create an account with name Amar.' }
  ),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

export async function GET() {
  try {
    await requireAdmin();
    const accounts = await listHRAccounts();
    return NextResponse.json({ success: true, accounts });
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
    const parsed = createHRSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const created = await createHRAccount(parsed.data.name, parsed.data.password);
    return NextResponse.json({ success: true, account: created }, { status: 201 });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { id, password } = body;
    if (!id || !password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Valid HR account ID and password (min 6 chars) are required.' },
        { status: 400 }
      );
    }

    const success = await updateHRAccountPassword(id, password);
    if (!success) {
      return NextResponse.json({ success: false, error: 'HR account not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'HR password updated successfully.' });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'HR account ID is required.' }, { status: 400 });
    }

    await deleteHRAccount(id);
    return NextResponse.json({ success: true, message: 'HR account deleted successfully.' });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
