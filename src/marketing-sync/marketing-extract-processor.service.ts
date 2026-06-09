import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketingAdDailyPerformance } from '../database/entities/marketing-sync/marketing-ad-daily-performance.entity';
import { MarketingCampaignDailyPerformance } from '../database/entities/marketing-sync/marketing-campaign-daily-performance.entity';
import { MarketingExtractJob } from '../database/entities/marketing-sync/marketing-extract-job.entity';
import { MarketingExtractRaw } from '../database/entities/marketing-sync/marketing-extract-raw.entity';
import { GoogleAdsOAuthService } from '../oauth/google-ads-oauth.service';
import { MetaAdsOAuthService } from '../oauth/meta-ads-oauth.service';

type GoogleSearchStreamChunk = {
  results?: Array<{
    campaign?: {
      id?: string;
      name?: string;
    };
    adGroup?: {
      id?: string;
      name?: string;
    };
    adGroupAd?: {
      ad?: {
        id?: string;
        name?: string;
      };
    };
    metrics?: {
      impressions?: string;
      clicks?: string;
      costMicros?: string;
      conversions?: number | string;
    };
    segments?: {
      date?: string;
    };
  }>;
};

type MetaInsightsResponse = {
  data?: Array<{
    campaign_id?: string;
    campaign_name?: string;
    account_name?: string;
    adset_id?: string;
    adset_name?: string;
    ad_id?: string;
    ad_name?: string;
    date_start?: string;
    impressions?: string;
    clicks?: string;
    spend?: string;
    actions?: Array<{
      action_type?: string;
      value?: string;
    }>;
  }>;
};

@Injectable()
export class MarketingExtractProcessorService {
  private readonly logger = new Logger(MarketingExtractProcessorService.name);
  private readonly numericScale = 6n;
  private readonly numericMultiplier = 10n ** this.numericScale;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(MarketingExtractJob)
    private readonly jobRepository: Repository<MarketingExtractJob>,
    @InjectRepository(MarketingExtractRaw)
    private readonly rawRepository: Repository<MarketingExtractRaw>,
    @InjectRepository(MarketingAdDailyPerformance)
    private readonly adPerformanceRepository: Repository<MarketingAdDailyPerformance>,
    @InjectRepository(MarketingCampaignDailyPerformance)
    private readonly performanceRepository: Repository<MarketingCampaignDailyPerformance>,
    private readonly googleAdsOAuthService: GoogleAdsOAuthService,
    private readonly metaAdsOAuthService: MetaAdsOAuthService,
  ) {}

  async processJob(jobId: string) {
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
      relations: { oauth_connection: true },
    });

    if (!job) {
      throw new NotFoundException('Job de extracao nao encontrado.');
    }

    job.status = 'running';
    job.started_at = new Date();
    job.error_message = undefined;
    await this.jobRepository.save(job);

    this.logger.log(
      [
        '[MARKETING_EXTRACT_START]',
        `jobId=${job.id}`,
        `provider=${job.provider}`,
        `account=${job.external_account_id}`,
        `dateFrom=${job.date_from}`,
        `dateTo=${job.date_to}`,
      ].join(' '),
    );

    try {
      let processingSummary: Record<string, unknown> = {};
      if (job.provider === 'google_ads') {
        processingSummary = await this.processGoogleJob(job);
      } else if (job.provider === 'meta_ads') {
        processingSummary = await this.processMetaJob(job);
      } else {
        throw new InternalServerErrorException(
          `Provider nao suportado para extracao: ${job.provider}`,
        );
      }

      job.status = 'completed';
      job.completed_at = new Date();
      job.metadata = {
        ...(job.metadata ?? {}),
        processingSummary,
      };
      await this.jobRepository.save(job);

      this.logger.log(
        [
          '[MARKETING_EXTRACT_DONE]',
          `jobId=${job.id}`,
          `provider=${job.provider}`,
          `account=${job.external_account_id}`,
          `dateFrom=${job.date_from}`,
          `dateTo=${job.date_to}`,
          `rawInserted=${String(processingSummary.rawInserted ?? 0)}`,
          `providerRows=${String(processingSummary.providerRows ?? 0)}`,
          `performanceUpserted=${String(processingSummary.performanceUpserted ?? 0)}`,
          `adPerformanceUpserted=${String(processingSummary.adPerformanceUpserted ?? 0)}`,
        ].join(' '),
      );

      return {
        id: job.id,
        provider: job.provider,
        status: job.status,
        completedAt: job.completed_at.toISOString(),
      };
    } catch (error) {
      job.status = 'failed';
      job.error_message =
        error instanceof Error ? error.message : String(error);
      job.completed_at = new Date();
      await this.jobRepository.save(job);

      this.logger.error(
        `Falha ao processar job ${job.id}: ${job.error_message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private async processGoogleJob(job: MarketingExtractJob) {
    const accessToken =
      await this.googleAdsOAuthService.getAuthorizedAccessTokenForConnection(
        job.oauth_connection.id,
      );
    const loginCustomerId =
      this.googleAdsOAuthService.getConfiguredLoginCustomerId();
    const response = await fetch(
      `${this.googleAdsOAuthService.getGoogleAdsBaseUrl()}/customers/${job.external_account_id}/googleAds:searchStream`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'developer-token':
            this.config.get<string>('GOOGLE_ADS_DEVELOPER_TOKEN') ?? '',
          ...(loginCustomerId ? { 'login-customer-id': loginCustomerId } : {}),
        },
        body: JSON.stringify({
          query: [
            'SELECT',
            'campaign.id,',
            'campaign.name,',
            'ad_group.id,',
            'ad_group.name,',
            'ad_group_ad.ad.id,',
            'ad_group_ad.ad.name,',
            'segments.date,',
            'metrics.impressions,',
            'metrics.clicks,',
            'metrics.cost_micros,',
            'metrics.conversions',
            'FROM ad_group_ad',
            `WHERE segments.date BETWEEN '${job.date_from}' AND '${job.date_to}'`,
          ].join(' '),
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        [
          '[GOOGLE_EXTRACT_ERROR]',
          `jobId=${job.id}`,
          `account=${job.external_account_id}`,
          `dateFrom=${job.date_from}`,
          `dateTo=${job.date_to}`,
          `body=${body}`,
        ].join(' '),
      );
      throw new InternalServerErrorException(
        `Falha ao extrair campanhas Google Ads: ${body}`,
      );
    }

    const payload = (await response.json()) as GoogleSearchStreamChunk[];
    const rows = payload.flatMap((chunk) => chunk.results ?? []);
    this.logProviderPreview('google_ads', job, rows);
    await this.deleteExistingConsolidatedRows(job);

    let rawInserted = 0;
    let performanceUpserted = 0;
    let adPerformanceUpserted = 0;
    const campaignAggregates = new Map<
      string,
      {
        reportDate: string;
        externalCampaignId: string;
        campaignName?: string;
        impressions: bigint;
        clicks: bigint;
        spendMicros: bigint;
        conversionsScaled: bigint;
      }
    >();
    const adRows = new Map<
      string,
      {
        reportDate: string;
        externalAdId: string;
        externalCampaignId?: string;
        campaignName?: string;
        externalAdsetId?: string;
        adsetName?: string;
        adName?: string;
        impressions: string;
        clicks: string;
        spend: string;
        conversions?: string;
        metadata: Record<string, unknown>;
      }
    >();

    for (const row of rows) {
      const reportDate = row.segments?.date ?? job.date_from;
      await this.rawRepository.save(
        this.rawRepository.create({
          job,
          provider: job.provider,
          external_account_id: job.external_account_id,
          report_date: reportDate,
          payload: row as unknown as Record<string, unknown>,
        }),
      );
      rawInserted += 1;

      const campaignId = row.campaign?.id;
      if (!campaignId) {
        continue;
      }

      const campaignKey = `${campaignId}:${reportDate}`;
      const campaignAggregate = campaignAggregates.get(campaignKey) ?? {
        reportDate,
        externalCampaignId: campaignId,
        campaignName: row.campaign?.name ?? undefined,
        impressions: 0n,
        clicks: 0n,
        spendMicros: 0n,
        conversionsScaled: 0n,
      };

      campaignAggregate.campaignName ??= row.campaign?.name ?? undefined;
      campaignAggregate.impressions += BigInt(row.metrics?.impressions ?? '0');
      campaignAggregate.clicks += BigInt(row.metrics?.clicks ?? '0');
      campaignAggregate.spendMicros += BigInt(row.metrics?.costMicros ?? '0');
      campaignAggregate.conversionsScaled += this.decimalStringToScaledInt(
        row.metrics?.conversions !== undefined
          ? String(row.metrics.conversions)
          : undefined,
      );
      campaignAggregates.set(campaignKey, campaignAggregate);

      const externalAdId = row.adGroupAd?.ad?.id;
      if (!externalAdId) {
        continue;
      }

      adRows.set(`${externalAdId}:${reportDate}`, {
        reportDate,
        externalAdId,
        externalCampaignId: row.campaign?.id ?? undefined,
        campaignName: row.campaign?.name ?? undefined,
        externalAdsetId: row.adGroup?.id ?? undefined,
        adsetName: row.adGroup?.name ?? undefined,
        adName: row.adGroupAd?.ad?.name ?? undefined,
        impressions: String(row.metrics?.impressions ?? '0'),
        clicks: String(row.metrics?.clicks ?? '0'),
        spend: this.microsToDecimalString(row.metrics?.costMicros),
        conversions:
          row.metrics?.conversions !== undefined
            ? String(row.metrics.conversions)
            : undefined,
        metadata: row as unknown as Record<string, unknown>,
      });
    }

    for (const aggregate of campaignAggregates.values()) {
      const entity = this.performanceRepository.create({
        provider: job.provider,
        external_account_id: job.external_account_id,
        external_campaign_id: aggregate.externalCampaignId,
        report_date: aggregate.reportDate,
        campaign_name: aggregate.campaignName,
        impressions: aggregate.impressions.toString(),
        clicks: aggregate.clicks.toString(),
        spend: this.scaledIntToDecimalString(aggregate.spendMicros),
        conversions: this.scaledIntToOptionalDecimalString(
          aggregate.conversionsScaled,
        ),
      });

      await this.performanceRepository.save(entity);
      performanceUpserted += 1;
    }

    for (const adRow of adRows.values()) {
      const entity = this.adPerformanceRepository.create({
        provider: job.provider,
        external_account_id: job.external_account_id,
        external_ad_id: adRow.externalAdId,
        report_date: adRow.reportDate,
        external_campaign_id: adRow.externalCampaignId,
        campaign_name: adRow.campaignName,
        external_adset_id: adRow.externalAdsetId,
        adset_name: adRow.adsetName,
        ad_name: adRow.adName,
        impressions: adRow.impressions,
        clicks: adRow.clicks,
        spend: adRow.spend,
        conversions: adRow.conversions,
        metadata: adRow.metadata,
      });

      await this.adPerformanceRepository.save(entity);
      adPerformanceUpserted += 1;
    }

    return {
      rawInserted,
      performanceUpserted,
      adPerformanceUpserted,
      providerRows: rows.length,
    };
  }

  private async processMetaJob(job: MarketingExtractJob) {
    const accessToken =
      await this.metaAdsOAuthService.getAuthorizedAccessTokenForConnection(
        job.oauth_connection.id,
      );
    const url = new URL(
      `${this.metaAdsOAuthService.getGraphBaseUrl()}/act_${job.external_account_id}/insights`,
    );
    url.searchParams.set(
      'fields',
      'account_name,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,date_start,impressions,clicks,spend,actions',
    );
    url.searchParams.set('level', 'ad');
    url.searchParams.set('time_increment', '1');
    url.searchParams.set(
      'time_range',
      JSON.stringify({ since: job.date_from, until: job.date_to }),
    );
    url.searchParams.set('access_token', accessToken);

    const response = await fetch(url);
    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        [
          '[META_EXTRACT_ERROR]',
          `jobId=${job.id}`,
          `account=${job.external_account_id}`,
          `dateFrom=${job.date_from}`,
          `dateTo=${job.date_to}`,
          `url=${url.toString()}`,
          `body=${body}`,
        ].join(' '),
      );
      throw new InternalServerErrorException(
        `Falha ao extrair campanhas Meta Ads: ${body}`,
      );
    }

    const payload = (await response.json()) as MetaInsightsResponse;
    const rows = payload.data ?? [];
    this.logProviderPreview('meta_ads', job, rows);
    await this.deleteExistingConsolidatedRows(job);

    let rawInserted = 0;
    let performanceUpserted = 0;
    let adPerformanceUpserted = 0;
    const campaignAggregates = new Map<
      string,
      {
        reportDate: string;
        externalCampaignId: string;
        campaignName?: string;
        impressions: bigint;
        clicks: bigint;
        spendScaled: bigint;
        conversionsScaled: bigint;
      }
    >();
    const adRows = new Map<
      string,
      {
        reportDate: string;
        externalAdId: string;
        accountName?: string;
        externalCampaignId?: string;
        campaignName?: string;
        externalAdsetId?: string;
        adsetName?: string;
        adName?: string;
        impressions: string;
        clicks: string;
        spend: string;
        conversions?: string;
        metadata: Record<string, unknown>;
      }
    >();

    for (const row of rows) {
      const reportDate = row.date_start ?? job.date_from;
      await this.rawRepository.save(
        this.rawRepository.create({
          job,
          provider: job.provider,
          external_account_id: job.external_account_id,
          report_date: reportDate,
          payload: row as unknown as Record<string, unknown>,
        }),
      );
      rawInserted += 1;

      if (!row.campaign_id) {
        continue;
      }

      const conversions = this.extractMetaConversions(row.actions);
      const campaignKey = `${row.campaign_id}:${reportDate}`;
      const campaignAggregate = campaignAggregates.get(campaignKey) ?? {
        reportDate,
        externalCampaignId: row.campaign_id,
        campaignName: row.campaign_name ?? undefined,
        impressions: 0n,
        clicks: 0n,
        spendScaled: 0n,
        conversionsScaled: 0n,
      };

      campaignAggregate.campaignName ??= row.campaign_name ?? undefined;
      campaignAggregate.impressions += BigInt(row.impressions ?? '0');
      campaignAggregate.clicks += BigInt(row.clicks ?? '0');
      campaignAggregate.spendScaled += this.decimalStringToScaledInt(row.spend);
      campaignAggregate.conversionsScaled +=
        this.decimalStringToScaledInt(conversions);
      campaignAggregates.set(campaignKey, campaignAggregate);

      if (!row.ad_id) {
        continue;
      }

      adRows.set(`${row.ad_id}:${reportDate}`, {
        reportDate,
        externalAdId: row.ad_id,
        accountName: row.account_name ?? undefined,
        externalCampaignId: row.campaign_id ?? undefined,
        campaignName: row.campaign_name ?? undefined,
        externalAdsetId: row.adset_id ?? undefined,
        adsetName: row.adset_name ?? undefined,
        adName: row.ad_name ?? undefined,
        impressions: String(row.impressions ?? '0'),
        clicks: String(row.clicks ?? '0'),
        spend: String(row.spend ?? '0'),
        conversions,
        metadata: row as unknown as Record<string, unknown>,
      });
    }

    for (const aggregate of campaignAggregates.values()) {
      const entity = this.performanceRepository.create({
        provider: job.provider,
        external_account_id: job.external_account_id,
        external_campaign_id: aggregate.externalCampaignId,
        report_date: aggregate.reportDate,
        campaign_name: aggregate.campaignName,
        impressions: aggregate.impressions.toString(),
        clicks: aggregate.clicks.toString(),
        spend: this.scaledIntToDecimalString(aggregate.spendScaled),
        conversions: this.scaledIntToOptionalDecimalString(
          aggregate.conversionsScaled,
        ),
      });

      await this.performanceRepository.save(entity);
      performanceUpserted += 1;
    }

    for (const adRow of adRows.values()) {
      const entity = this.adPerformanceRepository.create({
        provider: job.provider,
        external_account_id: job.external_account_id,
        account_name: adRow.accountName,
        external_campaign_id: adRow.externalCampaignId,
        campaign_name: adRow.campaignName,
        external_adset_id: adRow.externalAdsetId,
        adset_name: adRow.adsetName,
        external_ad_id: adRow.externalAdId,
        ad_name: adRow.adName,
        report_date: adRow.reportDate,
        impressions: adRow.impressions,
        clicks: adRow.clicks,
        spend: adRow.spend,
        conversions: adRow.conversions,
        metadata: adRow.metadata,
      });

      await this.adPerformanceRepository.save(entity);
      adPerformanceUpserted += 1;
    }

    return {
      rawInserted,
      performanceUpserted,
      adPerformanceUpserted,
      providerRows: rows.length,
    };
  }

  private async deleteExistingConsolidatedRows(job: MarketingExtractJob) {
    await this.performanceRepository
      .createQueryBuilder()
      .delete()
      .from(MarketingCampaignDailyPerformance)
      .where('provider = :provider', { provider: job.provider })
      .andWhere('external_account_id = :accountId', {
        accountId: job.external_account_id,
      })
      .andWhere('report_date BETWEEN :dateFrom AND :dateTo', {
        dateFrom: job.date_from,
        dateTo: job.date_to,
      })
      .execute();

    await this.adPerformanceRepository
      .createQueryBuilder()
      .delete()
      .from(MarketingAdDailyPerformance)
      .where('provider = :provider', { provider: job.provider })
      .andWhere('external_account_id = :accountId', {
        accountId: job.external_account_id,
      })
      .andWhere('report_date BETWEEN :dateFrom AND :dateTo', {
        dateFrom: job.date_from,
        dateTo: job.date_to,
      })
      .execute();
  }

  private logProviderPreview(
    provider: 'google_ads' | 'meta_ads',
    job: MarketingExtractJob,
    rows: Array<Record<string, unknown>>,
  ) {
    const firstRow = rows[0];
    const preview =
      firstRow == null
        ? 'null'
        : JSON.stringify(firstRow, null, 2).slice(0, 1200);

    const header = [
      provider === 'google_ads'
        ? '[GOOGLE_EXTRACT_RESULT]'
        : '[META_EXTRACT_RESULT]',
      `jobId=${job.id}`,
      `account=${job.external_account_id}`,
      `dateFrom=${job.date_from}`,
      `dateTo=${job.date_to}`,
      `providerRows=${rows.length}`,
    ].join(' ');

    if (rows.length === 0) {
      this.logger.warn(`${header} preview=null`);
      return;
    }

    this.logger.log(`${header} preview=${preview}`);
  }

  private microsToDecimalString(costMicros?: string): string {
    const micros = BigInt(costMicros ?? '0');
    const whole = micros / this.numericMultiplier;
    const fraction = micros % this.numericMultiplier;
    return `${whole}.${fraction.toString().padStart(6, '0')}`;
  }

  private decimalStringToScaledInt(value?: string): bigint {
    if (!value?.trim()) {
      return 0n;
    }

    const normalized = value.trim();
    const negative = normalized.startsWith('-');
    const unsigned = negative ? normalized.slice(1) : normalized;
    const [wholePart, fractionPart = ''] = unsigned.split('.');
    const safeWhole = wholePart || '0';
    const safeFraction = fractionPart.padEnd(Number(this.numericScale), '0');
    const scaledFraction = safeFraction.slice(0, Number(this.numericScale));
    const scaled =
      BigInt(safeWhole) * this.numericMultiplier +
      BigInt(scaledFraction || '0');

    return negative ? -scaled : scaled;
  }

  private scaledIntToDecimalString(value: bigint): string {
    const negative = value < 0;
    const absolute = negative ? -value : value;
    const whole = absolute / this.numericMultiplier;
    const fraction = absolute % this.numericMultiplier;
    const prefix = negative ? '-' : '';

    return `${prefix}${whole}.${fraction.toString().padStart(Number(this.numericScale), '0')}`;
  }

  private scaledIntToOptionalDecimalString(value: bigint): string | undefined {
    if (value === 0n) {
      return undefined;
    }

    return this.scaledIntToDecimalString(value);
  }

  private extractMetaConversions(
    actions?: Array<{ action_type?: string; value?: string }>,
  ): string | undefined {
    if (!actions?.length) {
      return undefined;
    }

    const relevant = actions.filter((item) =>
      (item.action_type ?? '').includes('lead'),
    );

    if (!relevant.length) {
      return undefined;
    }

    const total = relevant.reduce((sum, item) => {
      const value = Number(item.value ?? '0');
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);

    return String(total);
  }
}
