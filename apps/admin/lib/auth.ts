/**
 * @file auth.ts
 * @brief Enterprise Authentication & Session Management for IEEE ECU SB Admin & HR.
 * @details Implements secure password hashing with bcrypt, stateless signed JWTs,
 *          and strict role-based access control (RBAC) separating Full Admin and HR.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { UserRole } from '@ieee-recruitment/shared';

function getJwtSecret(): string {
  const envSecret = process.env.JWT_SECRET;
  if (envSecret) return envSecret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable is required in production.');
  }
  console.warn('[AUTH] ⚠ JWT_SECRET not set — using auto-generated dev key. Sessions will reset on restart.');
  return require('crypto').randomBytes(32).toString('hex');
}
const JWT_SECRET_STRING = getJwtSecret();
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET_STRING);
const TOKEN_COOKIE_NAME = 'ieee_recruitment_session';

export interface UserSession {
  userId: string;
  name: string;
  role: UserRole;
}

/**
 * @brief Hashes a plaintext password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * @brief Verifies a plaintext password against a bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * @brief Signs a JWT session token valid for 12 hours.
 */
export async function signSessionToken(payload: UserSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(SECRET_KEY);
}

/**
 * @brief Verifies an incoming JWT token string and extracts session claims.
 */
export async function verifySessionToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      userId: payload.userId as string,
      name: payload.name as string,
      role: payload.role as UserRole,
    };
  } catch (err) {
    return null;
  }
}

/**
 * @brief Sets the HTTP-only secure cookie for the session.
 */
export function setSessionCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 12, // 12 hours
    path: '/',
  });
}

/**
 * @brief Retrieves the current user session from the HTTP-only cookie.
 */
export async function getSession(): Promise<UserSession | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * @brief Clears the active session cookie.
 */
export function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(TOKEN_COOKIE_NAME);
}

/**
 * @brief Helper to require Admin authentication in API routes.
 */
export async function requireAdmin(): Promise<UserSession> {
  const session = await getSession();
  if (!session || session.role !== 'FULL_ADMIN') {
    throw new Error('UNAUTHORIZED_ADMIN');
  }
  return session;
}

/**
 * @brief Helper to require HR or Admin authentication in API routes.
 */
export async function requireAuth(): Promise<UserSession> {
  const session = await getSession();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}
