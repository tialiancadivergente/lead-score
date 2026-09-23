import type { Request } from 'express';
import type { ConfigService } from '@nestjs/config';
import { isIP } from 'net';

export function getClientIp(req: Request, config: ConfigService): string {
  const socketIp = normalizeIp(req.ip || req.socket.remoteAddress);
  const trustedProxyCidrs = parseTrustedProxyCidrs(
    config.get<string>('AUTH_TRUSTED_PROXY_CIDRS', ''),
  );

  if (!socketIp || !isTrustedProxy(socketIp, trustedProxyCidrs)) {
    return socketIp || 'unknown-ip';
  }

  return (
    getFirstHeaderIp(req, 'x-real-ip') ||
    getFirstHeaderIp(req, 'x-vercel-forwarded-for') ||
    getFirstHeaderIp(req, 'x-forwarded-for') ||
    socketIp
  );
}

function getFirstHeaderIp(req: Request, headerName: string): string | null {
  const value = req.headers[headerName];
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;

  const candidate = raw.split(',')[0]?.trim();
  const normalized = normalizeIp(candidate);
  return normalized && isIP(normalized) ? normalized : null;
}

function parseTrustedProxyCidrs(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isTrustedProxy(ip: string, cidrs: string[]): boolean {
  if (!cidrs.length) return false;
  return cidrs.some((cidr) => ipMatchesCidr(ip, cidr));
}

function ipMatchesCidr(ip: string, cidr: string): boolean {
  const [rangeIp, prefixRaw] = cidr.split('/');
  const normalizedRangeIp = normalizeIp(rangeIp);
  if (!normalizedRangeIp) return false;

  if (!prefixRaw) return ip === normalizedRangeIp;
  const prefix = Number(prefixRaw);

  if (isIPv4(ip) && isIPv4(normalizedRangeIp)) {
    return ipv4MatchesCidr(ip, normalizedRangeIp, prefix);
  }

  return false;
}

function ipv4MatchesCidr(ip: string, rangeIp: string, prefix: number): boolean {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipv4ToNumber(ip) & mask) === (ipv4ToNumber(rangeIp) & mask);
}

function ipv4ToNumber(ip: string): number {
  return ip
    .split('.')
    .reduce((acc, part) => ((acc << 8) + Number(part)) >>> 0, 0);
}

function isIPv4(ip: string): boolean {
  return isIP(ip) === 4;
}

function normalizeIp(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.startsWith('::ffff:')) return trimmed.slice('::ffff:'.length);
  return trimmed;
}
