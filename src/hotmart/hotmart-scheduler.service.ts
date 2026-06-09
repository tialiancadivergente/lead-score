import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { HotmartSyncScheduleService } from './hotmart-sync-schedule.service';
import { HotmartService } from './hotmart.service';

const SCHEDULER_ENABLED = process.env.HOTMART_SCHEDULER_ENABLED !== 'false';
const SCHEDULED_HOURS = [9, 15, 21];
const LOOKBACK_DAYS = 7;

@Injectable()
export class HotmartSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HotmartSchedulerService.name);
  private intervalRef?: NodeJS.Timeout;
  private isRunning = false;

  constructor(
    private readonly hotmartService: HotmartService,
    private readonly hotmartSyncScheduleService: HotmartSyncScheduleService,
  ) {}

  onModuleInit() {
    if (!SCHEDULER_ENABLED) {
      this.logger.log(
        'Scheduler Hotmart desabilitado (HOTMART_SCHEDULER_ENABLED != true)',
      );
      return;
    }
    const hoursLabel = SCHEDULED_HOURS.map((h) => `${h}h`).join(', ');
    this.logger.log(
      `Scheduler Hotmart habilitado. Horários padrão: ${hoursLabel} + agendamentos do banco a cada minuto`,
    );
    this.intervalRef = setInterval(() => void this.tick(), 60_000);
  }

  onModuleDestroy() {
    if (this.intervalRef) clearInterval(this.intervalRef);
  }

  private async tick() {
    const now = new Date();
    const hh = now.getHours();
    const mm = now.getMinutes();
    const hhStr = String(hh).padStart(2, '0');
    const mmStr = String(mm).padStart(2, '0');
    const hhmm = `${hhStr}:${mmStr}`;

    // Run default sync at scheduled hours on the :00 minute
    if (mm === 0 && SCHEDULED_HOURS.includes(hh)) {
      await this.runDefaultSync();
    }

    // Run DB-configured schedules matching the current HH:MM
    try {
      const schedules =
        await this.hotmartSyncScheduleService.getActiveSchedulesForTime(hhmm);
      for (const schedule of schedules) {
        this.logger.log(
          `Executando agendamento DB: ${schedule.id} (${schedule.name ?? 'sem nome'}) às ${hhmm}`,
        );
        await this.hotmartSyncScheduleService.runNow(schedule.id);
      }
    } catch (err) {
      this.logger.error(
        'Falha ao verificar agendamentos do banco',
        err instanceof Error ? err.stack : undefined,
      );
    }
  }

  private async runDefaultSync() {
    if (this.isRunning) {
      this.logger.warn('Execução anterior ainda em andamento, tick ignorado');
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
        `Executando sync Hotmart padrão: ${startDate} → ${endDate} (últimos ${LOOKBACK_DAYS} dias)`,
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
    }
  }
}
