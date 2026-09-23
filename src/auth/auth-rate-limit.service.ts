import { Injectable, Logger, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  action: string;
  ip?: string;
  subject?: string;
  limit: number;
  ttlMs: number;
}

@Injectable()
export class AuthRateLimitService {
  private readonly logger = new Logger(AuthRateLimitService.name);
  private readonly buckets = new Map<string, RateLimitBucket>();
  private cleanupChecks = 0;

  constructor(@Optional() private readonly dataSource?: DataSource) {}

  async check(options: RateLimitOptions): Promise<number> {
    if (this.dataSource?.isInitialized) {
      try {
        return await this.checkPostgres(options);
      } catch (error) {
        this.logger.warn(
          `Falling back to in-memory auth rate limit: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return this.checkMemory(options);
  }

  private async checkPostgres(options: RateLimitOptions): Promise<number> {
    const now = Date.now();
    const resetAt = new Date(now + options.ttlMs);
    const [row] = await this.dataSource!.query(
      `
        INSERT INTO auth_rate_limits ("key", "count", "reset_at", "updated_at")
        VALUES ($1, 1, $2, now())
        ON CONFLICT ("key") DO UPDATE SET
          "count" = CASE
            WHEN auth_rate_limits."reset_at" <= now() THEN 1
            ELSE auth_rate_limits."count" + 1
          END,
          "reset_at" = CASE
            WHEN auth_rate_limits."reset_at" <= now() THEN EXCLUDED."reset_at"
            ELSE auth_rate_limits."reset_at"
          END,
          "updated_at" = now()
        RETURNING "count", "reset_at" AS "resetAt"
      `,
      [this.buildKey(options), resetAt],
    );

    void this.cleanupPostgres();

    const count = Number(row?.count ?? 0);
    if (count <= options.limit) return 0;

    const bucketResetAt =
      row?.resetAt instanceof Date
        ? row.resetAt.getTime()
        : new Date(row?.resetAt).getTime();

    return Math.max(1, Math.ceil((bucketResetAt - now) / 1000));
  }

  private checkMemory(options: RateLimitOptions): number {
    const now = Date.now();
    const key = this.buildKey(options);
    const existing = this.buckets.get(key);
    const bucket =
      !existing || existing.resetAt <= now
        ? { count: 0, resetAt: now + options.ttlMs }
        : existing;

    bucket.count += 1;
    this.buckets.set(key, bucket);
    this.cleanup(now);

    if (bucket.count <= options.limit) return 0;
    return Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  }

  private buildKey(options: RateLimitOptions): string {
    const ip = options.ip?.trim() || 'unknown-ip';
    const subject = options.subject?.trim().toLowerCase() || 'anonymous';
    return `${options.action}:${ip}:${subject}`;
  }

  private cleanup(now: number): void {
    if (this.buckets.size < 5_000) return;
    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }

  private async cleanupPostgres(): Promise<void> {
    this.cleanupChecks += 1;
    if (this.cleanupChecks % 100 !== 0) return;

    try {
      await this.dataSource!.query(
        `DELETE FROM auth_rate_limits WHERE "reset_at" < now() - interval '10 minutes'`,
      );
    } catch {
      // Rate-limit cleanup is best effort; the hot path should not fail on it.
    }
  }
}
