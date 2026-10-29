import { UnauthorizedException } from '@nestjs/common';
import type { CookieOptions, Request } from 'express';

export const COOKIE_NAME = 'united_session';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isSessionId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

/** Only cookie-parser's verified signed cookie is trusted as a visitor identifier. */
export function requireSessionUser(request: Request): string {
  const cookie: unknown = request.signedCookies?.[COOKIE_NAME];
  if (!isSessionId(cookie)) {
    throw new UnauthorizedException('Open the page to create a session');
  }
  return cookie;
}

export function sessionCookieOptions(): CookieOptions {
  return {
    signed: true,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 365 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}
