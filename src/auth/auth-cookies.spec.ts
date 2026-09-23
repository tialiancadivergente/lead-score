import type { Request } from 'express';
import {
  ACCESS_TOKEN_COOKIE,
  getAccessTokenFromRequest,
  getCookie,
  getRefreshTokenFromRequest,
  parseCookieHeader,
  REFRESH_TOKEN_COOKIE,
} from './auth-cookies';

describe('auth-cookies', () => {
  it('parses access and refresh cookies from the Cookie header', () => {
    const cookies = parseCookieHeader(
      `${ACCESS_TOKEN_COOKIE}=access.jwt; ${REFRESH_TOKEN_COOKIE}=refresh-token`,
    );

    expect(cookies[ACCESS_TOKEN_COOKIE]).toBe('access.jwt');
    expect(cookies[REFRESH_TOKEN_COOKIE]).toBe('refresh-token');
  });

  it('decodes encoded cookie values without throwing on malformed values', () => {
    expect(parseCookieHeader('refresh_token=abc%20123').refresh_token).toBe(
      'abc 123',
    );
    expect(parseCookieHeader('refresh_token=%E0%A4%A').refresh_token).toBe(
      '%E0%A4%A',
    );
  });

  it('extracts refresh token from cookie only', () => {
    const req = {
      headers: {
        cookie: `${REFRESH_TOKEN_COOKIE}=from-cookie`,
      },
    } as Request;

    expect(getRefreshTokenFromRequest(req)).toBe('from-cookie');
  });

  it('extracts a cookie by name from request headers', () => {
    const req = {
      headers: {
        cookie: `${ACCESS_TOKEN_COOKIE}=jwt-value`,
      },
    } as Request;

    expect(getCookie(req, ACCESS_TOKEN_COOKIE)).toBe('jwt-value');
  });

  it('extracts the access token cookie for cookie-only logout fallback', () => {
    const req = {
      headers: {
        cookie: `${ACCESS_TOKEN_COOKIE}=access.jwt.value`,
      },
    } as Request;

    expect(getAccessTokenFromRequest(req)).toBe('access.jwt.value');
  });
});
