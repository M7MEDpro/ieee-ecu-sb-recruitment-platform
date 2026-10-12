/**
 * @file login/route.ts
 * @brief Unified Authentication Endpoint for Full Admin and HR Accounts.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  findAdminByUsername,
  findHRByName,
  logAudit,
} from '@/lib/db';
import {
  verifyPassword,
  signSessionToken,
  setSessionCookie,
} from '@/lib/auth';

const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Username / Name is required.'),
  password: z.string().min(1, 'Password is required.'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { identifier, password } = parsed.data;

    // 1. Check if Full Admin (Environment-based override — only if explicitly configured)
    const envAdminUser = process.env.ADMIN_USERNAME;
    const envAdminPass = process.env.ADMIN_PASSWORD;

    if (
      envAdminUser &&
      envAdminPass &&
      identifier.toLowerCase() === envAdminUser.toLowerCase() &&
      password === envAdminPass
    ) {
      const token = await signSessionToken({
        userId: 'a0000000-0000-0000-0000-000000000001',
        name: 'Executive Administrator',
        role: 'FULL_ADMIN',
      });

      setSessionCookie(token);
      logAudit('ADMIN', 'Executive Administrator', 'LOGIN_SUCCESS');

      return NextResponse.json({
        success: true,
        user: {
          name: 'Executive Administrator',
          role: 'FULL_ADMIN',
        },
      });
    }

    // Check Admin in DB
    const adminRecord = await findAdminByUsername(identifier);
    if (adminRecord) {
      const match = await verifyPassword(password, adminRecord.passwordHash);
      if (match) {
        const token = await signSessionToken({
          userId: adminRecord.id,
          name: adminRecord.name,
          role: 'FULL_ADMIN',
        });

        setSessionCookie(token);
        logAudit('ADMIN', adminRecord.name, 'LOGIN_SUCCESS');

        return NextResponse.json({
          success: true,
          user: {
            name: adminRecord.name,
            role: 'FULL_ADMIN',
          },
        });
      }
    }

    // 2. Check if HR Account
    const hrRecord = await findHRByName(identifier);
    if (hrRecord && hrRecord.passwordHash) {
      const match = await verifyPassword(password, hrRecord.passwordHash);
      if (match) {
        const token = await signSessionToken({
          userId: hrRecord.id,
          name: hrRecord.name,
          role: 'HR',
        });

        setSessionCookie(token);
        logAudit('HR', hrRecord.name, 'LOGIN_SUCCESS');

        return NextResponse.json({
          success: true,
          user: {
            id: hrRecord.id,
            name: hrRecord.name,
            role: 'HR',
          },
        });
      }
    }

    return NextResponse.json(
      { success: false, error: 'Invalid username or password.' },
      { status: 401 }
    );
  } catch (err: any) {
    console.error('[API:login] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Authentication service error.' },
      { status: 500 }
    );
  }
}
