import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { HotmartService } from './hotmart.service';

const SCHEDULER_ENABLED = process.env.HOTMART_SCHEDULER_ENABLED !== 'false';
const SCHEDULED_HOURS = [9, 15, 21];
const LOOKBACK_DAYS = 7;

@Injectable()
export class HotmartSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HotmartSchedulerService.name);
  private timeoutRef?: NodeJS.Timeout;
  private isRunning = false;

  constructor(private readonly hotmartService: HotmartService) {}

  onModuleInit() {
    if (!SCHEDULER_ENABLED) {
      this.logger.log(
        'Scheduler Hotmart desabilitado (HOTMART_SCHEDULER_ENABLED != true)',
      );
      return;
    }
    this.logger.log(
      `Scheduler Hotmart habilitado. Horários: ${SCHEDULED_HOURS.map((h) => `${h}h`).join(', ')}`,
    );
    this.scheduleNext();
  }

  onModuleDestroy() {
    if (this.timeoutRef) clearTimeout(this.timeoutRef);
  }

  private scheduleNext() {
    if (this.timeoutRef) clearTimeout(this.timeoutRef);
    const next = this.getNextFireTime();
    const msUntilNext = next.getTime() - Date.now();
    this.logger.log(
      `Próxima execução agendada: ${next.toLocaleString('pt-BR')}`,
    );
    this.timeoutRef = setTimeout(() => void this.run(), msUntilNext);
  }

  private async run() {
    if (this.isRunning) {
      this.logger.warn('Execução anterior ainda em andamento, tick ignorado');
      this.scheduleNext();
      return;
    }

    this.isRunning = true;
    try {
      const now = new Date();
      const startDate = new Date(
        now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
      )
        .toISOString()
        .split('T')[0];
      const endDate = now.toISOString().split('T')[0];

      this.logger.log(
        `Executando sync Hotmart: ${startDate} → ${endDate} (últimos ${LOOKBACK_DAYS} dias)`,
      );

      const result = await this.hotmartService.syncHistory({
        startDate,
        endDate,
      });
      this.logger.log(
        `Sync concluído: synced=${result.synced} skipped=${result.skipped}`,
      );
    } catch (err) {
      this.logger.error(
        'Falha no scheduler Hotmart',
        err instanceof Error ? err.stack : undefined,
      );
    } finally {
      this.isRunning = false;
      this.scheduleNext();
    }
  }

  private getNextFireTime(): Date {
    const now = new Date();

    for (const hour of SCHEDULED_HOURS) {
      const candidate = new Date(now);
      candidate.setHours(hour, 0, 0, 0);
      if (candidate > now) return candidate;
    }

    // Todos os horários de hoje já passaram — próximo é 09h de amanhã
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(SCHEDULED_HOURS[0], 0, 0, 0);
    return tomorrow;
  }
}
