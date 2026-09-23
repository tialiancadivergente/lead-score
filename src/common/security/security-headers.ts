import type { NextFunction, Request, Response } from 'express';

const CSP = [
  "default-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'none'",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
].join('; ');

export function securityHeadersMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains',
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  const originalSetHeader = res.setHeader.bind(res);
  res.setHeader = ((name: string, value: number | string | readonly string[]) => {
    if (
      name.toLowerCase() === 'content-type' &&
      String(value).toLowerCase().includes('text/html') &&
      !res.hasHeader('Content-Security-Policy')
    ) {
      originalSetHeader('Content-Security-Policy', CSP);
    }
    return originalSetHeader(name, value);
  }) as typeof res.setHeader;

  next();
}
