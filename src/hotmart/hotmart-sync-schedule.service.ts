import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HotmartSyncSchedule } from '../database/entities/hotmart/hotmart-sync-schedule.entity';
import { HotmartService } from './hotmart.service';

interface CreateScheduleDto {
  name?: string;
  period_preset: string;
  date_from?: string;
  date_to?: string;
  transaction_status?: string;
  scheduled_time: string;
  active?: boolean;
}

@Injectable()
export class HotmartSyncScheduleService {
  constructor(
    @InjectRepository(HotmartSyncSchedule)
    private readonly repo: Repository<HotmartSyncSchedule>,
    private readonly hotmartService: HotmartService,
  ) {}

  listAll(): Promise<HotmartSyncSchedule[]> {
    return this.repo.find({ order: { created_at: 'DESC' } });
  }

  async create(dto: CreateScheduleDto): Promise<HotmartSyncSchedule> {
    const schedule = this.repo.create({
      name: dto.name,
      period_preset: dto.period_preset,
      date_from: dto.date_from,
      date_to: dto.date_to,
      transaction_status: dto.transaction_status,
      scheduled_time: dto.scheduled_time,
      active: dto.active ?? true,
    });
    return this.repo.save(schedule);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async runNow(id: string): Promise<{ status: string }> {
    const schedule = await this.repo.findOneOrFail({ where: { id } });
    const { startDate, endDate } = this.resolveDateRange(schedule);

    // Fire-and-forget
    this.hotmartService
      .syncHistory({
        startDate,
        endDate,
        transactionStatus: schedule.transaction_status ?? undefined,
      })
      .catch(() => undefined);

    schedule.last_run_at = new Date();
    await this.repo.save(schedule);

    return { status: 'started' };
  }

  async getActiveSchedulesForTime(
    hhmm: string,
  ): Promise<HotmartSyncSchedule[]> {
    const todayMidnightUTC = new Date();
    todayMidnightUTC.setUTCHours(0, 0, 0, 0);

    return this.repo
      .createQueryBuilder('s')
      .where('s.active = true')
      .andWhere('s.scheduled_time = :hhmm', { hhmm })
      .andWhere('(s.last_run_at IS NULL OR s.last_run_at < :midnight)', {
        midnight: todayMidnightUTC,
      })
      .getMany();
  }

  private resolveDateRange(schedule: HotmartSyncSchedule): {
    startDate: string;
    endDate: string;
  } {
    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    if (schedule.period_preset === 'last_7d') {
      const start = new Date(now.getTime() - 7 * 86400000);
      return { startDate: start.toISOString().split('T')[0], endDate };
    }
    if (schedule.period_preset === 'last_30d') {
      const start = new Date(now.getTime() - 30 * 86400000);
      return { startDate: start.toISOString().split('T')[0], endDate };
    }
    if (schedule.period_preset === 'last_90d') {
      const start = new Date(now.getTime() - 90 * 86400000);
      return { startDate: start.toISOString().split('T')[0], endDate };
    }
    // custom
    return {
      startDate: schedule.date_from ?? endDate,
      endDate: schedule.date_to ?? endDate,
    };
  }
}
