import type { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { getClientIp } from './client-ip';

function config(value: string): ConfigService {
  return {
    get: jest.fn().mockReturnValue(value),
  } as unknown as ConfigService;
}

function request(params: {
  socketIp: string;
  headers?: Record<string, string>;
}): Request {
  return {
    ip: params.socketIp,
    socket: { remoteAddress: params.socketIp },
    headers: params.headers ?? {},
  } as unknown as Request;
}

describe('getClientIp', () => {
  it('ignores forwarded headers when socket ip is not trusted', () => {
    expect(
      getClientIp(
        request({
          socketIp: '203.0.113.10',
          headers: { 'x-forwarded-for': '198.51.100.77' },
        }),
        config('10.0.0.0/8'),
      ),
    ).toBe('203.0.113.10');
  });

  it('uses x-real-ip when socket ip is from a trusted proxy cidr', () => {
    expect(
      getClientIp(
        request({
          socketIp: '10.244.1.12',
          headers: { 'x-real-ip': '198.51.100.77' },
        }),
        config('10.0.0.0/8'),
      ),
    ).toBe('198.51.100.77');
  });

  it('falls back to x-forwarded-for when trusted and x-real-ip is absent', () => {
    expect(
      getClientIp(
        request({
          socketIp: '10.244.1.12',
          headers: {
            'x-forwarded-for': '198.51.100.77, 203.0.113.10',
          },
        }),
        config('10.0.0.0/8'),
      ),
    ).toBe('198.51.100.77');
  });
});
