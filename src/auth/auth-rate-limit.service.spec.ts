import { AuthRateLimitService } from './auth-rate-limit.service';

describe('AuthRateLimitService', () => {
  it('returns zero while calls are inside the configured limit', async () => {
    const service = new AuthRateLimitService();

    await expect(
      service.check({
        action: 'login',
        ip: '127.0.0.1',
        subject: 'User@Example.com',
        limit: 2,
        ttlMs: 60_000,
      }),
    ).resolves.toBe(0);
    await expect(
      service.check({
        action: 'login',
        ip: '127.0.0.1',
        subject: 'user@example.com',
        limit: 2,
        ttlMs: 60_000,
      }),
    ).resolves.toBe(0);
  });

  it('returns retry-after seconds once the bucket is exhausted', async () => {
    const service = new AuthRateLimitService();
    const options = {
      action: 'login',
      ip: '127.0.0.1',
      subject: 'user@example.com',
      limit: 1,
      ttlMs: 60_000,
    };

    await expect(service.check(options)).resolves.toBe(0);
    await expect(service.check(options)).resolves.toBeGreaterThan(0);
  });

  it('uses postgres when a data source is available', async () => {
    const dataSource = {
      isInitialized: true,
      query: jest.fn().mockResolvedValue([
        {
          count: 2,
          resetAt: new Date(Date.now() + 60_000),
        },
      ]),
    };
    const service = new AuthRateLimitService(dataSource as never);

    const retryAfter = await service.check({
      action: 'login',
      ip: '127.0.0.1',
      subject: 'user@example.com',
      limit: 1,
      ttlMs: 60_000,
    });

    expect(retryAfter).toBeGreaterThan(0);
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('auth_rate_limits'),
      expect.any(Array),
    );
  });
});
