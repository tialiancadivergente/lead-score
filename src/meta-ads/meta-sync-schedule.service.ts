import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MetaSyncSchedule,
  MetaSyncStep,
} from '../database/entities/meta-ads/meta-sync-schedule.entity';
import { MetaAdsService } from './meta-ads.service';

interface CreateMetaSyncScheduleDto {
  name?: string;
  sync_step: MetaSyncStep;
  period_preset: string;
  date_from?: string;
  date_to?: string;
  level?: string;
  scheduled_time: string;
  active?: boolean;
}

@Injectable()
export class MetaSyncScheduleService {
  constructor(
    @InjectRepository(MetaSyncSchedule)
    private readonly repo: Repository<MetaSyncSchedule>,
    private readonly metaAdsService: MetaAdsService,
  ) {}

  listAll(): Promise<MetaSyncSchedule[]> {
    return this.repo.find({ order: { created_at: 'DESC' } });
  }

  async create(dto: CreateMetaSyncScheduleDto): Promise<MetaSyncSchedule> {
    const schedule = this.repo.create({
      name: dto.name,
      sync_step: dto.sync_step,
      period_preset: dto.period_preset,
      date_from: dto.date_from,
      date_to: dto.date_to,
      level: dto.level ?? 'ad',
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
    const { since, until } = this.resolveDateRange(schedule);

    this.dispatchSync(schedule, since, until).catch(() => undefined);

    schedule.last_run_at = new Date();
    await this.repo.save(schedule);

    return { status: 'started' };
  }

  async getActiveSchedulesForTime(hhmm: string): Promise<MetaSyncSchedule[]> {
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

  private resolveDateRange(schedule: MetaSyncSchedule): {
    since: string;
    until: string;
  } {
    const now = new Date();
    const until = now.toISOString().split('T')[0];
    if (schedule.period_preset === 'yesterday') {
      const yesterday = new Date(now.getTime() - 86400000);
      const y = yesterday.toISOString().split('T')[0];
      return { since: y, until: y };
    }
    if (schedule.period_preset === 'last_7d') {
      const start = new Date(now.getTime() - 7 * 86400000);
      return { since: start.toISOString().split('T')[0], until };
    }
    if (schedule.period_preset === 'last_30d') {
      const start = new Date(now.getTime() - 30 * 86400000);
      return { since: start.toISOString().split('T')[0], until };
    }
    if (schedule.period_preset === 'last_90d') {
      const start = new Date(now.getTime() - 90 * 86400000);
      return { since: start.toISOString().split('T')[0], until };
    }
    return {
      since: schedule.date_from ?? until,
      until: schedule.date_to ?? until,
    };
  }

  private async dispatchSync(
    schedule: MetaSyncSchedule,
    since: string,
    until: string,
  ): Promise<void> {
    const baseParams = { triggeredBy: 'scheduler', since, until };

    switch (schedule.sync_step) {
      case 'insights_bulk':
        await this.metaAdsService.enqueueInsightsBulkAsync({
          ...baseParams,
          level: schedule.level as 'ad' | 'adset' | 'campaign',
        });
        break;
      case 'insights':
        await this.metaAdsService.syncInsights({
          ...baseParams,
          level: schedule.level as 'ad' | 'adset' | 'campaign',
        });
        break;
      case 'campaigns':
        await this.metaAdsService.syncCampaigns(baseParams);
        break;
      case 'adsets':
        await this.metaAdsService.syncAdsets(baseParams);
        break;
      case 'ads':
        await this.metaAdsService.syncAds(baseParams);
        break;
      case 'full':
        await this.metaAdsService.syncAll(baseParams);
        break;
    }
  }
}
