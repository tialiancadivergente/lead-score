import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Capture } from '../database/entities/capture/capture.entity';
import { MarketingAdDailyPerformance } from '../database/entities/marketing-sync/marketing-ad-daily-performance.entity';
import { MarketingDashboardFiltersQueryDto } from './dto/marketing-dashboard-filters-query.dto';
import { MarketingDashboardSummaryQueryDto } from './dto/marketing-dashboard-summary-query.dto';
import { MarketingDashboardTableQueryDto } from './dto/marketing-dashboard-table-query.dto';

type MarketingDashboardTableRow = {
  provider: string;
  externalAccountId: string;
  accountName: string | null;
  externalCampaignId: string | null;
  campaignName: string | null;
  externalAdsetId: string | null;
  adsetName: string | null;
  externalAdId: string;
  adName: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  registrations: number;
  cpc: number | null;
  ctr: number | null;
  cpm: number | null;
  cpl: number | null;
};

@Injectable()
export class MarketingDashboardService {
  private static readonly TABLE_SORT_FIELDS = new Set([
    'spend',
    'impressions',
    'clicks',
    'conversions',
    'registrations',
    'cpc',
    'ctr',
    'cpm',
    'cpl',
    'campaignName',
    'adsetName',
    'adName',
  ]);

  private static readonly DEFAULT_TABLE_PAGE = 1;
  private static readonly DEFAULT_TABLE_PAGE_SIZE = 25;
  private static readonly MAX_TABLE_PAGE_SIZE = 100;

  constructor(
    @InjectRepository(MarketingAdDailyPerformance)
    private readonly adPerformanceRepository: Repository<MarketingAdDailyPerformance>,
    @InjectRepository(Capture)
    private readonly captureRepository: Repository<Capture>,
  ) {}

  async getFilters(query: MarketingDashboardFiltersQueryDto) {
    this.validateFiltersQuery(query);

    const providers = await this.getDistinctMediaValues({
      ...query,
      provider: undefined,
      externalAccountId: undefined,
      externalCampaignId: undefined,
      externalAdsetId: undefined,
      externalAdId: undefined,
    }, {
      column: 'provider',
      valueAlias: 'value',
      labelColumn: 'provider',
      labelAlias: 'label',
    });

    const accounts = await this.getDistinctMediaValues(query, {
      column: 'external_account_id',
      valueAlias: 'value',
      labelColumn: 'account_name',
      labelAlias: 'label',
    });

    const campaigns = await this.getDistinctMediaValues(query, {
      column: 'external_campaign_id',
      valueAlias: 'value',
      labelColumn: 'campaign_name',
      labelAlias: 'label',
      excludeNullValues: true,
    });

    const adsets = await this.getDistinctMediaValues(query, {
      column: 'external_adset_id',
      valueAlias: 'value',
      labelColumn: 'adset_name',
      labelAlias: 'label',
      excludeNullValues: true,
    });

    const ads = await this.getDistinctMediaValues(query, {
      column: 'external_ad_id',
      valueAlias: 'value',
      labelColumn: 'ad_name',
      labelAlias: 'label',
      excludeNullValues: true,
    });

    const [launches, seasons] = await Promise.all([
      this.getLaunchOptions(query),
      this.getSeasonOptions(query),
    ]);

    return {
      filters: this.buildFiltersResponse({
        provider: query.provider,
        externalAccountId: query.externalAccountId,
        externalCampaignId: query.externalCampaignId,
        externalAdsetId: query.externalAdsetId,
        externalAdId: query.externalAdId,
        dateFrom: query.dateFrom ?? null,
        dateTo: query.dateTo ?? null,
        launchId: query.launchId,
        seasonId: query.seasonId,
      }),
      options: {
        providers,
        accounts,
        campaigns,
        adsets,
        ads,
        launches,
        seasons,
      },
    };
  }

  async getSummary(query: MarketingDashboardSummaryQueryDto) {
    this.validateSummaryQuery(query);

    const mediaSummary = await this.getMediaSummary(query);
    const registrations = await this.getRegistrationsCount(query);

    return {
      filters: this.buildFiltersResponse(query),
      summary: {
        spend: mediaSummary.spend,
        impressions: mediaSummary.impressions,
        clicks: mediaSummary.clicks,
        conversions: mediaSummary.conversions,
        registrations,
        cpc: this.divideOrNull(mediaSummary.spend, mediaSummary.clicks),
        ctr: this.divideOrNull(mediaSummary.clicks, mediaSummary.impressions),
        cpm:
          mediaSummary.impressions > 0
            ? Number(((mediaSummary.spend * 1000) / mediaSummary.impressions).toFixed(6))
            : null,
        cpl: this.divideOrNull(mediaSummary.spend, registrations),
      },
    };
  }

  async getTimeseries(query: MarketingDashboardSummaryQueryDto) {
    this.validateSummaryQuery(query);

    const mediaRows = await this.getMediaTimeseries(query);
    const registrationRows = await this.getRegistrationTimeseries(query);

    const mediaByDate = new Map(mediaRows.map((row) => [row.date, row]));
    const registrationsByDate = new Map(
      registrationRows.map((row) => [row.date, row.registrations]),
    );

    const timeseries = this.listDatesBetween(query.dateFrom!, query.dateTo!).map(
      (date) => {
        const media = mediaByDate.get(date) ?? {
          spend: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
        };
        const registrations = registrationsByDate.get(date) ?? 0;

        return {
          date,
          spend: media.spend,
          impressions: media.impressions,
          clicks: media.clicks,
          conversions: media.conversions,
          registrations,
          cpc: this.divideOrNull(media.spend, media.clicks),
          ctr: this.divideOrNull(media.clicks, media.impressions),
          cpm:
            media.impressions > 0
              ? Number(((media.spend * 1000) / media.impressions).toFixed(6))
              : null,
          cpl: this.divideOrNull(media.spend, registrations),
        };
      },
    );

    return {
      filters: this.buildFiltersResponse(query),
      timeseries,
    };
  }

  async getTable(query: MarketingDashboardTableQueryDto) {
    this.validateSummaryQuery(query);

    const pagination = this.parseTablePagination(query);
    const sorting = this.parseTableSorting(query);
    const mediaRows = await this.getMediaTableRows(query);
    const registrationsByAdId = await this.getRegistrationsByAdId(query);

    const rows: MarketingDashboardTableRow[] = mediaRows.map((row) => {
      const registrations = registrationsByAdId.get(row.externalAdId) ?? 0;

      return {
        ...row,
        registrations,
        cpc: this.divideOrNull(row.spend, row.clicks),
        ctr: this.divideOrNull(row.clicks, row.impressions),
        cpm:
          row.impressions > 0
            ? Number(((row.spend * 1000) / row.impressions).toFixed(6))
            : null,
        cpl: this.divideOrNull(row.spend, registrations),
      };
    });

    const sortedRows = rows.sort((left, right) =>
      this.compareTableRows(left, right, sorting.sortBy, sorting.sortOrder),
    );

    const total = sortedRows.length;
    const start = (pagination.page - 1) * pagination.pageSize;
    const items = sortedRows.slice(start, start + pagination.pageSize);

    return {
      filters: this.buildFiltersResponse(query),
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages: Math.ceil(total / pagination.pageSize),
      },
      sort: sorting,
      items,
    };
  }

  private validateSummaryQuery(query: MarketingDashboardSummaryQueryDto) {
    if (!query.dateFrom || !query.dateTo) {
      throw new BadRequestException('dateFrom e dateTo sao obrigatorios.');
    }

    if (!this.isIsoDate(query.dateFrom) || !this.isIsoDate(query.dateTo)) {
      throw new BadRequestException(
        'dateFrom e dateTo devem estar no formato YYYY-MM-DD.',
      );
    }
  }

  private validateFiltersQuery(query: MarketingDashboardFiltersQueryDto) {
    if ((query.dateFrom && !query.dateTo) || (!query.dateFrom && query.dateTo)) {
      throw new BadRequestException(
        'dateFrom e dateTo devem ser enviados juntos no endpoint de filtros.',
      );
    }

    if (query.dateFrom && !this.isIsoDate(query.dateFrom)) {
      throw new BadRequestException('dateFrom deve estar no formato YYYY-MM-DD.');
    }

    if (query.dateTo && !this.isIsoDate(query.dateTo)) {
      throw new BadRequestException('dateTo deve estar no formato YYYY-MM-DD.');
    }
  }

  private parseTablePagination(query: MarketingDashboardTableQueryDto) {
    const page = Number.parseInt(
      query.page ?? String(MarketingDashboardService.DEFAULT_TABLE_PAGE),
      10,
    );
    const rawPageSize = Number.parseInt(
      query.pageSize ?? String(MarketingDashboardService.DEFAULT_TABLE_PAGE_SIZE),
      10,
    );
    const pageSize = Math.min(
      Math.max(rawPageSize || MarketingDashboardService.DEFAULT_TABLE_PAGE_SIZE, 1),
      MarketingDashboardService.MAX_TABLE_PAGE_SIZE,
    );

    if (!Number.isInteger(page) || page < 1) {
      throw new BadRequestException('page deve ser um inteiro >= 1.');
    }

    return { page, pageSize };
  }

  private parseTableSorting(query: MarketingDashboardTableQueryDto) {
    const sortBy = query.sortBy ?? 'spend';
    const sortOrder = (query.sortOrder ?? 'desc').toLowerCase();

    if (!MarketingDashboardService.TABLE_SORT_FIELDS.has(sortBy)) {
      throw new BadRequestException(
        'sortBy invalido. Use apenas campos permitidos pela whitelist.',
      );
    }

    if (sortOrder !== 'asc' && sortOrder !== 'desc') {
      throw new BadRequestException('sortOrder deve ser asc ou desc.');
    }

    return {
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc',
    };
  }

  private async getMediaSummary(query: MarketingDashboardSummaryQueryDto) {
    const qb = this.adPerformanceRepository.createQueryBuilder('media');
    this.applyMediaFilters(qb, query);

    const row = await qb
      .select('COALESCE(SUM(media.spend), 0)', 'spend')
      .addSelect('COALESCE(SUM(media.impressions), 0)', 'impressions')
      .addSelect('COALESCE(SUM(media.clicks), 0)', 'clicks')
      .addSelect('COALESCE(SUM(media.conversions), 0)', 'conversions')
      .getRawOne<{
        spend: string;
        impressions: string;
        clicks: string;
        conversions: string;
      }>();

    return {
      spend: Number(row?.spend ?? '0'),
      impressions: Number(row?.impressions ?? '0'),
      clicks: Number(row?.clicks ?? '0'),
      conversions: Number(row?.conversions ?? '0'),
    };
  }

  private async getRegistrationsCount(query: MarketingDashboardSummaryQueryDto) {
    const captureQb = this.captureRepository.createQueryBuilder('capture');

    captureQb.where((qb) => {
      const subQuery = qb
        .subQuery()
        .select('DISTINCT mf.external_ad_id')
        .from(MarketingAdDailyPerformance, 'mf');
      this.applyMediaFilters(
        subQuery as unknown as SelectQueryBuilder<MarketingAdDailyPerformance>,
        query,
        'mf',
      );
      return `capture.external_ad_id IN ${subQuery.getQuery()}`;
    });

    captureQb.andWhere(
      `COALESCE(capture.occurred_at, capture.created_at) >= :captureDateFrom`,
      {
        captureDateFrom: `${query.dateFrom}T00:00:00.000Z`,
      },
    );
    captureQb.andWhere(
      `COALESCE(capture.occurred_at, capture.created_at) < :captureDateToExclusive`,
      {
        captureDateToExclusive: this.nextDayIso(query.dateTo!),
      },
    );

    if (query.launchId) {
      captureQb.andWhere('capture.launch_id = :launchId', {
        launchId: query.launchId,
      });
    }

    if (query.seasonId) {
      captureQb.andWhere('capture.season_id = :seasonId', {
        seasonId: query.seasonId,
      });
    }

    return await captureQb.getCount();
  }

  private async getMediaTimeseries(query: MarketingDashboardSummaryQueryDto) {
    const qb = this.adPerformanceRepository.createQueryBuilder('media');
    this.applyMediaFilters(qb, query);

    const rows = await qb
      .select("TO_CHAR(media.report_date, 'YYYY-MM-DD')", 'date')
      .addSelect('COALESCE(SUM(media.spend), 0)', 'spend')
      .addSelect('COALESCE(SUM(media.impressions), 0)', 'impressions')
      .addSelect('COALESCE(SUM(media.clicks), 0)', 'clicks')
      .addSelect('COALESCE(SUM(media.conversions), 0)', 'conversions')
      .groupBy('media.report_date')
      .orderBy('media.report_date', 'ASC')
      .getRawMany<{
        date: string;
        spend: string;
        impressions: string;
        clicks: string;
        conversions: string;
      }>();

    return rows.map((row) => ({
      date: row.date,
      spend: Number(row.spend ?? '0'),
      impressions: Number(row.impressions ?? '0'),
      clicks: Number(row.clicks ?? '0'),
      conversions: Number(row.conversions ?? '0'),
    }));
  }

  private async getRegistrationTimeseries(
    query: MarketingDashboardSummaryQueryDto,
  ) {
    const captureQb = this.captureRepository.createQueryBuilder('capture');

    captureQb.where((qb) => {
      const subQuery = qb
        .subQuery()
        .select('DISTINCT mf.external_ad_id')
        .from(MarketingAdDailyPerformance, 'mf');
      this.applyMediaFilters(
        subQuery as unknown as SelectQueryBuilder<MarketingAdDailyPerformance>,
        query,
        'mf',
      );
      return `capture.external_ad_id IN ${subQuery.getQuery()}`;
    });

    captureQb.andWhere(
      `COALESCE(capture.occurred_at, capture.created_at) >= :captureDateFrom`,
      {
        captureDateFrom: `${query.dateFrom}T00:00:00.000Z`,
      },
    );
    captureQb.andWhere(
      `COALESCE(capture.occurred_at, capture.created_at) < :captureDateToExclusive`,
      {
        captureDateToExclusive: this.nextDayIso(query.dateTo!),
      },
    );

    if (query.launchId) {
      captureQb.andWhere('capture.launch_id = :launchId', {
        launchId: query.launchId,
      });
    }

    if (query.seasonId) {
      captureQb.andWhere('capture.season_id = :seasonId', {
        seasonId: query.seasonId,
      });
    }

    const rows = await captureQb
      .select(
        `TO_CHAR(DATE(COALESCE(capture.occurred_at, capture.created_at)), 'YYYY-MM-DD')`,
        'date',
      )
      .addSelect('COUNT(capture.id)', 'registrations')
      .groupBy(`DATE(COALESCE(capture.occurred_at, capture.created_at))`)
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; registrations: string }>();

    return rows.map((row) => ({
      date: row.date,
      registrations: Number(row.registrations ?? '0'),
    }));
  }

  private async getMediaTableRows(query: MarketingDashboardSummaryQueryDto) {
    const qb = this.adPerformanceRepository.createQueryBuilder('media');
    this.applyMediaFilters(qb, query);

    const rows = await qb
      .select('media.provider', 'provider')
      .addSelect('media.external_account_id', 'externalAccountId')
      .addSelect('MAX(media.account_name)', 'accountName')
      .addSelect('MAX(media.external_campaign_id)', 'externalCampaignId')
      .addSelect('MAX(media.campaign_name)', 'campaignName')
      .addSelect('MAX(media.external_adset_id)', 'externalAdsetId')
      .addSelect('MAX(media.adset_name)', 'adsetName')
      .addSelect('media.external_ad_id', 'externalAdId')
      .addSelect('MAX(media.ad_name)', 'adName')
      .addSelect('COALESCE(SUM(media.spend), 0)', 'spend')
      .addSelect('COALESCE(SUM(media.impressions), 0)', 'impressions')
      .addSelect('COALESCE(SUM(media.clicks), 0)', 'clicks')
      .addSelect('COALESCE(SUM(media.conversions), 0)', 'conversions')
      .groupBy('media.provider')
      .addGroupBy('media.external_account_id')
      .addGroupBy('media.external_ad_id')
      .getRawMany<{
        provider: string;
        externalAccountId: string;
        accountName: string | null;
        externalCampaignId: string | null;
        campaignName: string | null;
        externalAdsetId: string | null;
        adsetName: string | null;
        externalAdId: string;
        adName: string | null;
        spend: string;
        impressions: string;
        clicks: string;
        conversions: string;
      }>();

    return rows.map((row) => ({
      provider: row.provider,
      externalAccountId: row.externalAccountId,
      accountName: row.accountName,
      externalCampaignId: row.externalCampaignId,
      campaignName: row.campaignName,
      externalAdsetId: row.externalAdsetId,
      adsetName: row.adsetName,
      externalAdId: row.externalAdId,
      adName: row.adName,
      spend: Number(row.spend ?? '0'),
      impressions: Number(row.impressions ?? '0'),
      clicks: Number(row.clicks ?? '0'),
      conversions: Number(row.conversions ?? '0'),
    }));
  }

  private async getRegistrationsByAdId(
    query: MarketingDashboardSummaryQueryDto,
  ) {
    const captureQb = this.captureRepository.createQueryBuilder('capture');

    captureQb.where((qb) => {
      const subQuery = qb
        .subQuery()
        .select('DISTINCT mf.external_ad_id')
        .from(MarketingAdDailyPerformance, 'mf');
      this.applyMediaFilters(
        subQuery as unknown as SelectQueryBuilder<MarketingAdDailyPerformance>,
        query,
        'mf',
      );
      return `capture.external_ad_id IN ${subQuery.getQuery()}`;
    });

    captureQb.andWhere(
      `COALESCE(capture.occurred_at, capture.created_at) >= :captureDateFrom`,
      {
        captureDateFrom: `${query.dateFrom}T00:00:00.000Z`,
      },
    );
    captureQb.andWhere(
      `COALESCE(capture.occurred_at, capture.created_at) < :captureDateToExclusive`,
      {
        captureDateToExclusive: this.nextDayIso(query.dateTo!),
      },
    );

    if (query.launchId) {
      captureQb.andWhere('capture.launch_id = :launchId', {
        launchId: query.launchId,
      });
    }

    if (query.seasonId) {
      captureQb.andWhere('capture.season_id = :seasonId', {
        seasonId: query.seasonId,
      });
    }

    const rows = await captureQb
      .select('capture.external_ad_id', 'externalAdId')
      .addSelect('COUNT(capture.id)', 'registrations')
      .groupBy('capture.external_ad_id')
      .getRawMany<{ externalAdId: string; registrations: string }>();

    return new Map(
      rows.map((row) => [
        row.externalAdId,
        Number(row.registrations ?? '0'),
      ]),
    );
  }

  private async getDistinctMediaValues(
    query: MarketingDashboardFiltersQueryDto,
    params: {
      column: string;
      valueAlias: string;
      labelColumn: string;
      labelAlias: string;
      excludeNullValues?: boolean;
    },
  ) {
    const qb = this.adPerformanceRepository.createQueryBuilder('media');
    this.applyMediaFilters(qb, query);

    if (params.excludeNullValues) {
      qb.andWhere(`media.${params.column} IS NOT NULL`);
    }

    const rows = await qb
      .select(`media.${params.column}`, params.valueAlias)
      .addSelect(`MAX(media.${params.labelColumn})`, params.labelAlias)
      .groupBy(`media.${params.column}`)
      .orderBy(`MAX(media.${params.labelColumn})`, 'ASC')
      .getRawMany<{ value: string | null; label: string | null }>();

    return rows
      .filter((row) => row.value)
      .map((row) => ({
        value: row.value as string,
        label: row.label ?? row.value,
      }));
  }

  private async getLaunchOptions(query: MarketingDashboardFiltersQueryDto) {
    const captureQb = this.captureRepository.createQueryBuilder('capture');

    captureQb
      .innerJoin('capture.launch', 'launch')
      .select('launch.id', 'value')
      .addSelect('launch.name', 'label')
      .where((qb) => {
        const subQuery = qb
          .subQuery()
          .select('DISTINCT mf.external_ad_id')
          .from(MarketingAdDailyPerformance, 'mf');
        this.applyMediaFilters(
          subQuery as unknown as SelectQueryBuilder<MarketingAdDailyPerformance>,
          query,
          'mf',
        );
        return `capture.external_ad_id IN ${subQuery.getQuery()}`;
      });

    this.applyCaptureFilters(captureQb, query);

    const rows = await captureQb
      .groupBy('launch.id')
      .addGroupBy('launch.name')
      .orderBy('launch.name', 'ASC')
      .getRawMany<{ value: string; label: string }>();

    return rows;
  }

  private async getSeasonOptions(query: MarketingDashboardFiltersQueryDto) {
    const captureQb = this.captureRepository.createQueryBuilder('capture');

    captureQb
      .innerJoin('capture.season', 'season')
      .select('season.id', 'value')
      .addSelect('season.name', 'label')
      .where((qb) => {
        const subQuery = qb
          .subQuery()
          .select('DISTINCT mf.external_ad_id')
          .from(MarketingAdDailyPerformance, 'mf');
        this.applyMediaFilters(
          subQuery as unknown as SelectQueryBuilder<MarketingAdDailyPerformance>,
          query,
          'mf',
        );
        return `capture.external_ad_id IN ${subQuery.getQuery()}`;
      });

    this.applyCaptureFilters(captureQb, query);

    const rows = await captureQb
      .groupBy('season.id')
      .addGroupBy('season.name')
      .orderBy('season.name', 'ASC')
      .getRawMany<{ value: string; label: string }>();

    return rows;
  }

  private applyCaptureFilters(
    qb: SelectQueryBuilder<Capture>,
    query: MarketingDashboardFiltersQueryDto,
  ) {
    if (query.dateFrom && query.dateTo) {
      qb.andWhere(
        `COALESCE(capture.occurred_at, capture.created_at) >= :captureDateFrom`,
        {
          captureDateFrom: `${query.dateFrom}T00:00:00.000Z`,
        },
      );
      qb.andWhere(
        `COALESCE(capture.occurred_at, capture.created_at) < :captureDateToExclusive`,
        {
          captureDateToExclusive: this.nextDayIso(query.dateTo),
        },
      );
    }

    if (query.launchId) {
      qb.andWhere('capture.launch_id = :launchId', {
        launchId: query.launchId,
      });
    }

    if (query.seasonId) {
      qb.andWhere('capture.season_id = :seasonId', {
        seasonId: query.seasonId,
      });
    }
  }

  private applyMediaFilters(
    qb: SelectQueryBuilder<MarketingAdDailyPerformance>,
    query: {
      provider?: string;
      externalAccountId?: string;
      externalCampaignId?: string;
      externalAdsetId?: string;
      externalAdId?: string;
      dateFrom?: string | null;
      dateTo?: string | null;
    },
    alias = 'media',
  ) {
    let hasWhere = false;

    if (query.dateFrom) {
      qb.where(`${alias}.report_date >= :dateFrom`, { dateFrom: query.dateFrom });
      hasWhere = true;
    }

    if (query.dateTo) {
      if (hasWhere) {
        qb.andWhere(`${alias}.report_date <= :dateTo`, { dateTo: query.dateTo });
      } else {
        qb.where(`${alias}.report_date <= :dateTo`, { dateTo: query.dateTo });
        hasWhere = true;
      }
    }

    if (query.provider) {
      (hasWhere ? qb.andWhere : qb.where).call(qb, `${alias}.provider = :provider`, {
        provider: query.provider,
      });
      hasWhere = true;
    }

    if (query.externalAccountId) {
      (hasWhere ? qb.andWhere : qb.where).call(
        qb,
        `${alias}.external_account_id = :externalAccountId`,
        {
        externalAccountId: query.externalAccountId,
        },
      );
      hasWhere = true;
    }

    if (query.externalCampaignId) {
      (hasWhere ? qb.andWhere : qb.where).call(
        qb,
        `${alias}.external_campaign_id = :externalCampaignId`,
        {
        externalCampaignId: query.externalCampaignId,
        },
      );
      hasWhere = true;
    }

    if (query.externalAdsetId) {
      (hasWhere ? qb.andWhere : qb.where).call(
        qb,
        `${alias}.external_adset_id = :externalAdsetId`,
        {
        externalAdsetId: query.externalAdsetId,
        },
      );
      hasWhere = true;
    }

    if (query.externalAdId) {
      (hasWhere ? qb.andWhere : qb.where).call(
        qb,
        `${alias}.external_ad_id = :externalAdId`,
        {
        externalAdId: query.externalAdId,
        },
      );
    }
  }

  private divideOrNull(
    numerator: number,
    denominator: number,
  ): number | null {
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
      return null;
    }

    return Number((numerator / denominator).toFixed(6));
  }

  private isIsoDate(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  private nextDayIso(date: string): string {
    const parsed = new Date(`${date}T00:00:00.000Z`);
    parsed.setUTCDate(parsed.getUTCDate() + 1);
    return parsed.toISOString();
  }

  private listDatesBetween(dateFrom: string, dateTo: string): string[] {
    const dates: string[] = [];
    const current = new Date(`${dateFrom}T00:00:00.000Z`);
    const end = new Date(`${dateTo}T00:00:00.000Z`);

    while (current <= end) {
      dates.push(current.toISOString().slice(0, 10));
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return dates;
  }

  private buildFiltersResponse(query: {
    provider?: string | null;
    externalAccountId?: string | null;
    externalCampaignId?: string | null;
    externalAdsetId?: string | null;
    externalAdId?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
    launchId?: string | null;
    seasonId?: string | null;
  }) {
    return {
      provider: query.provider ?? null,
      externalAccountId: query.externalAccountId ?? null,
      externalCampaignId: query.externalCampaignId ?? null,
      externalAdsetId: query.externalAdsetId ?? null,
      externalAdId: query.externalAdId ?? null,
      dateFrom: query.dateFrom ?? null,
      dateTo: query.dateTo ?? null,
      launchId: query.launchId ?? null,
      seasonId: query.seasonId ?? null,
    };
  }

  private compareTableRows(
    left: MarketingDashboardTableRow,
    right: MarketingDashboardTableRow,
    sortBy: string,
    sortOrder: 'asc' | 'desc',
  ) {
    const factor = sortOrder === 'asc' ? 1 : -1;
    const leftValue = left[sortBy as keyof MarketingDashboardTableRow];
    const rightValue = right[sortBy as keyof MarketingDashboardTableRow];

    if (leftValue == null && rightValue == null) {
      return 0;
    }
    if (leftValue == null) {
      return 1;
    }
    if (rightValue == null) {
      return -1;
    }

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      if (leftValue === rightValue) {
        return left.adName?.localeCompare(right.adName ?? '') ?? 0;
      }
      return (leftValue - rightValue) * factor;
    }

    const comparison = String(leftValue).localeCompare(String(rightValue), 'pt-BR', {
      sensitivity: 'base',
    });

    if (comparison === 0) {
      return (left.externalAdId.localeCompare(right.externalAdId) || 0) * factor;
    }

    return comparison * factor;
  }
}
