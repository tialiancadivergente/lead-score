import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetaAdsService } from './meta-ads.service';

@Injectable()
export class MetaSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(MetaSchedulerService.name);
  private intervalHandle?: ReturnType<typeof setInterval>;

  constructor(
    private readonly configService: ConfigService,
    private readonly metaAdsService: MetaAdsService,
  ) {}

  onModuleInit() {
    const enabled =
      this.configService.get<string>('META_SCHEDULER_ENABLED') === 'true';

    if (!enabled) {
      this.logger.log('Meta Ads scheduler disabled (META_SCHEDULER_ENABLED != true)');
      return;
    }

    const intervalMinutes = parseInt(
      this.configService.get<string>('META_SCHEDULER_INTERVAL_MINUTES') ?? '60',
      10,
    );
    const lookbackDays = parseInt(
      this.configService.get<string>('META_SCHEDULER_LOOKBACK_DAYS') ?? '7',
      10,
    );

    this.logger.log(
      `Meta Ads scheduler started: every ${intervalMinutes}min, ${lookbackDays}d lookback`,
    );

    this.runSync(lookbackDays);

    this.intervalHandle = setInterval(
      () => this.runSync(lookbackDays),
      intervalMinutes * 60 * 1000,
    );
  }

  private async runSync(lookbackDays: number) {
    const until = new Date();
    const since = new Date();
    since.setDate(since.getDate() - lookbackDays);

    const fmt = (d: Date) => d.toISOString().split('T')[0];

    this.logger.log(`Meta Ads scheduled sync: ${fmt(since)} → ${fmt(until)}`);

    try {
      const result = await this.metaAdsService.syncAll({
        triggeredBy: 'scheduler',
        since: fmt(since),
        until: fmt(until),
      });

      this.logger.log(
        `Meta Ads sync done: campaigns=${result.campaigns} adsets=${result.adsets} ads=${result.ads} insights=${result.insights}`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Meta Ads scheduled sync failed: ${msg}`);
    }
  }

  onModuleDestroy() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
    }
  }
}
