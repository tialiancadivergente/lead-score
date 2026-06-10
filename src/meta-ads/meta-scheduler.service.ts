import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetaAdsService } from './meta-ads.service';
import { MetaSyncScheduleService } from './meta-sync-schedule.service';

@Injectable()
export class MetaSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(MetaSchedulerService.name);
  private intervalHandle?: ReturnType<typeof setInterval>;
  private pollHandle?: ReturnType<typeof setInterval>;
  private dbScheduleHandle?: ReturnType<typeof setInterval>;

  constructor(
    private readonly configService: ConfigService,
    private readonly metaAdsService: MetaAdsService,
    private readonly metaSyncScheduleService: MetaSyncScheduleService,
  ) {}

  onModuleInit() {
    // Poller de jobs bulk async — roda sempre, independente do scheduler env
    this.startBulkJobPoller();
    // DB schedules — roda sempre, tick a cada minuto
    this.startDbScheduleTick();

    const enabled =
      this.configService.get<string>('META_SCHEDULER_ENABLED') === 'true';

    if (!enabled) {
      this.logger.log(
        'Meta Ads scheduler disabled (META_SCHEDULER_ENABLED != true)',
      );
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

  private startBulkJobPoller() {
    this.logger.log('Meta bulk job poller started (every 30s)');
    this.pollHandle = setInterval(() => {
      void this.metaAdsService.pollRunningBulkJobs().catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Bulk job poll error: ${msg}`);
      });
    }, 30_000);
  }

  private startDbScheduleTick() {
    this.logger.log('Meta DB schedule tick started (every 60s)');
    this.dbScheduleHandle = setInterval(() => {
      void this.tickDbSchedules().catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`DB schedule tick error: ${msg}`);
      });
    }, 60_000);
  }

  private async tickDbSchedules(): Promise<void> {
    const now = new Date();
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const mm = String(now.getUTCMinutes()).padStart(2, '0');
    const hhmm = `${hh}:${mm}`;

    const due = await this.metaSyncScheduleService.getActiveSchedulesForTime(hhmm);
    for (const schedule of due) {
      this.logger.log(
        `Running scheduled Meta sync "${schedule.name ?? schedule.id}" (${schedule.sync_step}, ${schedule.period_preset})`,
      );
      void this.metaSyncScheduleService.runNow(schedule.id).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Scheduled Meta sync ${schedule.id} failed: ${msg}`);
      });
    }
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
    if (this.intervalHandle) clearInterval(this.intervalHandle);
    if (this.pollHandle) clearInterval(this.pollHandle);
    if (this.dbScheduleHandle) clearInterval(this.dbScheduleHandle);
  }
}
