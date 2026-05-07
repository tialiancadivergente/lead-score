import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { HotmartService } from './hotmart.service';

// Para habilitar: HOTMART_SCHEDULER_ENABLED=true no .env
const SCHEDULER_ENABLED =
  process.env.HOTMART_SCHEDULER_ENABLED === 'true';
const SCHEDULER_INTERVAL_MINUTES = parseInt(
  process.env.HOTMART_SCHEDULER_INTERVAL_MINUTES ?? '60',
  10,
);

@Injectable()
export class HotmartSchedulerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(HotmartSchedulerService.name);
  private timeoutRef?: NodeJS.Timeout;
  private isRunning = false;

  constructor(private readonly hotmartService: HotmartService) {}

  onModuleInit() {
    if (!SCHEDULER_ENABLED) {
      this.logger.log(
        'Scheduler Hotmart desabilitado (HOTMART_SCHEDULER_ENABLED != true).',
      );
      return;
    }
    this.logger.log(
      `Scheduler Hotmart habilitado. Intervalo: ${SCHEDULER_INTERVAL_MINUTES} minuto(s).`,
    );
    this.scheduleNextTick();
  }

  onModuleDestroy() {
    if (this.timeoutRef) clearTimeout(this.timeoutRef);
  }

  private async runScheduledTick() {
    if (!SCHEDULER_ENABLED) return;

    if (this.isRunning) {
      this.logger.warn(
        'Execução anterior do scheduler Hotmart ainda em andamento. Tick ignorado.',
      );
      return this.scheduleNextTick();
    }

    this.isRunning = true;
    try {
      // Sync das últimas 24h
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const endDate = now.toISOString().split('T')[0];
      const startDate = yesterday.toISOString().split('T')[0];

      const result = await this.hotmartService.syncHistory({
        startDate,
        endDate,
      });
      this.logger.log(
        `Scheduler Hotmart executado. synced=${result.synced} skipped=${result.skipped}`,
      );
    } catch (error) {
      this.logger.error(
        'Falha no scheduler Hotmart.',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.isRunning = false;
      this.scheduleNextTick();
    }
  }

  private scheduleNextTick() {
    if (this.timeoutRef) clearTimeout(this.timeoutRef);
    this.timeoutRef = setTimeout(
      () => void this.runScheduledTick(),
      SCHEDULER_INTERVAL_MINUTES * 60 * 1000,
    );
  }
}
