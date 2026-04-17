import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MarketingSyncService } from './marketing-sync.service';

@Injectable()
export class MarketingDashboardSchedulerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(MarketingDashboardSchedulerService.name);
  private timeoutRef?: NodeJS.Timeout;
  private isRunning = false;

  constructor(
    private readonly marketingSyncService: MarketingSyncService,
  ) {}

  async onModuleInit() {
    const configuration =
      await this.marketingSyncService.getEffectiveMarketingExtractScheduleConfiguration();

    if (!configuration.enabled || !configuration.scheduleEnabled) {
      this.logger.log(
        `Scheduler horario de marketing dashboard desabilitado (${configuration.source}).`,
      );
      return;
    }

    this.logger.log(
      `Scheduler horario de marketing dashboard habilitado via ${configuration.source}. Intervalo: ${configuration.intervalMinutes} minuto(s).`,
    );

    this.scheduleNextTick(configuration.intervalMinutes);
  }

  onModuleDestroy() {
    if (this.timeoutRef) {
      clearTimeout(this.timeoutRef);
    }
  }

  private async runScheduledTick() {
    const configuration =
      await this.marketingSyncService.getEffectiveMarketingExtractScheduleConfiguration();

    if (!configuration.enabled || !configuration.scheduleEnabled) {
      this.logger.log(
        `Scheduler horario de marketing dashboard ignorado porque foi desabilitado via ${configuration.source}.`,
      );
      return this.scheduleNextTick(configuration.intervalMinutes);
    }

    if (this.isRunning) {
      this.logger.warn(
        'Execucao anterior do scheduler de marketing dashboard ainda esta em andamento. Tick atual ignorado.',
      );
      return this.scheduleNextTick(configuration.intervalMinutes);
    }

    this.isRunning = true;

    try {
      const result = await this.marketingSyncService.scheduleHourlyTodayJobs(
        configuration.provider ? { provider: configuration.provider } : undefined,
      );
      this.logger.log(
        `Scheduler de marketing dashboard executado com sucesso. source=${configuration.source} provider=${configuration.provider ?? 'all'} selectedAccounts=${result.selectedAccounts} enqueuedJobs=${result.enqueuedJobs} skippedJobs=${result.skippedJobs} targetDate=${result.targetDate}`,
      );
    } catch (error) {
      this.logger.error(
        'Falha no scheduler de marketing dashboard.',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.isRunning = false;
      this.scheduleNextTick(configuration.intervalMinutes);
    }
  }

  private scheduleNextTick(intervalMinutes: number) {
    if (this.timeoutRef) {
      clearTimeout(this.timeoutRef);
    }

    this.timeoutRef = setTimeout(() => {
      void this.runScheduledTick();
    }, intervalMinutes * 60 * 1000);
  }
}
