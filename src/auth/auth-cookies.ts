import type { Request, Response } from 'express';
import type { CookieOptions } from 'express-serve-static-core';
import type { ConfigService } from '@nestjs/config';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export function parseCookieHeader(
  cookieHeader: string | string[] | undefined,
): Record<string, string> {
  const header = Array.isArray(cookieHeader)
    ? cookieHeader.join('; ')
    : cookieHeader;

  if (!header) return {};

  return header
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((cookies, part) => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex < 0) return cookies;

      const name = part.slice(0, separatorIndex).trim();
      const rawValue = part.slice(separatorIndex + 1).trim();
      if (!name) return cookies;

      cookies[name] = decodeCookieValue(rawValue);
      return cookies;
    }, {});
}

export function getCookie(req: Request | undefined, name: string) {
  if (!req) return undefined;
  return parseCookieHeader(req.headers.cookie)[name];
}

export function getRefreshTokenFromRequest(
  req: Request | undefined,
): string | undefined {
  return getCookie(req, REFRESH_TOKEN_COOKIE);
}

export function getAccessTokenFromRequest(
  req: Request | undefined,
): string | undefined {
  return getCookie(req, ACCESS_TOKEN_COOKIE);
}

export function setAuthCookies(
  res: Response,
  tokens: AuthTokens,
  config: ConfigService,
): void {
  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...baseCookieOptions(),
    sameSite: 'lax',
    path: '/',
    maxAge: parseDurationMs(
      config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
      15 * 60 * 1000,
    ),
  });

  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...baseCookieOptions(),
    sameSite: 'strict',
    path: '/auth/refresh',
    maxAge: parseDurationMs(
      config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      7 * 24 * 60 * 60 * 1000,
    ),
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE, {
    ...baseCookieOptions(),
    sameSite: 'lax',
    path: '/',
  });
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    ...baseCookieOptions(),
    sameSite: 'strict',
    path: '/auth/refresh',
  });
}

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: true,
  };
}

function decodeCookieValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseDurationMs(value: string, fallback: number): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) return fallback;

  const amount = Number(match[1]);
  const unit = match[2];
  if (unit === 's') return amount * 1000;
  if (unit === 'm') return amount * 60 * 1000;
  if (unit === 'h') return amount * 60 * 60 * 1000;
  return amount * 24 * 60 * 60 * 1000;
}
