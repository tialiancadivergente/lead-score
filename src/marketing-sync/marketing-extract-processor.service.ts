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
          ...(loginCustomerId
            ? { 'login-customer-id': loginCustomerId }
            : {}),
        },
        body: JSON.stringify({
          query: [
            'SELECT',
            'campaign.id,',
            'campaign.name,',
            'segments.date,',
            'metrics.impressions,',
            'metrics.clicks,',
            'metrics.cost_micros,',
            'metrics.conversions',
            'FROM campaign',
            `WHERE segments.date BETWEEN '${job.date_from}' AND '${job.date_to}'`,
          ].join(' '),
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new InternalServerErrorException(
        `Falha ao extrair campanhas Google Ads: ${body}`,
      );
    }

    const payload = (await response.json()) as GoogleSearchStreamChunk[];
    const rows = payload.flatMap((chunk) => chunk.results ?? []);
    let rawInserted = 0;
    let performanceUpserted = 0;
    let adPerformanceUpserted = 0;

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

      const performance = await this.performanceRepository.findOne({
        where: {
          provider: job.provider,
          external_account_id: job.external_account_id,
          external_campaign_id: campaignId,
          report_date: reportDate,
        },
      });

      const entity =
        performance ??
        this.performanceRepository.create({
          provider: job.provider,
          external_account_id: job.external_account_id,
          external_campaign_id: campaignId,
          report_date: reportDate,
        });

      entity.campaign_name = row.campaign?.name ?? undefined;
      entity.impressions = String(row.metrics?.impressions ?? '0');
      entity.clicks = String(row.metrics?.clicks ?? '0');
      entity.spend = this.microsToDecimalString(row.metrics?.costMicros);
      entity.conversions =
        row.metrics?.conversions !== undefined
          ? String(row.metrics.conversions)
          : undefined;
      entity.metadata = row as unknown as Record<string, unknown>;

      await this.performanceRepository.save(entity);
      performanceUpserted += 1;

      const adDailyPersisted = await this.persistGoogleAdDailyPerformance({
        job,
        reportDate,
        row,
      });
      if (adDailyPersisted) {
        adPerformanceUpserted += 1;
      }
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
      'campaign_id,campaign_name,date_start,impressions,clicks,spend,actions',
    );
    url.searchParams.set('level', 'campaign');
    url.searchParams.set('time_increment', '1');
    url.searchParams.set(
      'time_range',
      JSON.stringify({ since: job.date_from, until: job.date_to }),
    );
    url.searchParams.set('access_token', accessToken);

    const response = await fetch(url);
    if (!response.ok) {
      const body = await response.text();
      throw new InternalServerErrorException(
        `Falha ao extrair campanhas Meta Ads: ${body}`,
      );
    }

    const payload = (await response.json()) as MetaInsightsResponse;
    const rows = payload.data ?? [];
    let rawInserted = 0;
    let performanceUpserted = 0;
    let adPerformanceUpserted = 0;

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

      const performance = await this.performanceRepository.findOne({
        where: {
          provider: job.provider,
          external_account_id: job.external_account_id,
          external_campaign_id: row.campaign_id,
          report_date: reportDate,
        },
      });

      const entity =
        performance ??
        this.performanceRepository.create({
          provider: job.provider,
          external_account_id: job.external_account_id,
          external_campaign_id: row.campaign_id,
          report_date: reportDate,
        });

      entity.campaign_name = row.campaign_name ?? undefined;
      entity.impressions = String(row.impressions ?? '0');
      entity.clicks = String(row.clicks ?? '0');
      entity.spend = String(row.spend ?? '0');
      entity.conversions = this.extractMetaConversions(row.actions);
      entity.metadata = row as unknown as Record<string, unknown>;

      await this.performanceRepository.save(entity);
      performanceUpserted += 1;

      const adDailyPersisted = await this.persistMetaAdDailyPerformance({
        job,
        reportDate,
        row,
      });
      if (adDailyPersisted) {
        adPerformanceUpserted += 1;
      }
    }

    return {
      rawInserted,
      performanceUpserted,
      adPerformanceUpserted,
      providerRows: rows.length,
    };
  }

  private async persistMetaAdDailyPerformance(params: {
    job: MarketingExtractJob;
    reportDate: string;
    row: NonNullable<MetaInsightsResponse['data']>[number];
  }): Promise<boolean> {
    const { job, reportDate, row } = params;
    if (!row.ad_id) {
      return false;
    }

    const performance = await this.adPerformanceRepository.findOne({
      where: {
        provider: job.provider,
        external_account_id: job.external_account_id,
        external_ad_id: row.ad_id,
        report_date: reportDate,
      },
    });

    const entity =
      performance ??
      this.adPerformanceRepository.create({
        provider: job.provider,
        external_account_id: job.external_account_id,
        external_ad_id: row.ad_id,
        report_date: reportDate,
      });

    entity.account_name = row.account_name ?? undefined;
    entity.external_campaign_id = row.campaign_id ?? undefined;
    entity.campaign_name = row.campaign_name ?? undefined;
    entity.external_adset_id = row.adset_id ?? undefined;
    entity.adset_name = row.adset_name ?? undefined;
    entity.ad_name = row.ad_name ?? undefined;
    entity.impressions = String(row.impressions ?? '0');
    entity.clicks = String(row.clicks ?? '0');
    entity.spend = String(row.spend ?? '0');
    entity.conversions = this.extractMetaConversions(row.actions);
    entity.metadata = row as unknown as Record<string, unknown>;

    await this.adPerformanceRepository.save(entity);
    return true;
  }

  private async persistGoogleAdDailyPerformance(params: {
    job: MarketingExtractJob;
    reportDate: string;
    row: NonNullable<GoogleSearchStreamChunk['results']>[number];
  }): Promise<boolean> {
    const { job, reportDate, row } = params;
    const externalAdId = row.adGroupAd?.ad?.id;
    if (!externalAdId) {
      return false;
    }

    const performance = await this.adPerformanceRepository.findOne({
      where: {
        provider: job.provider,
        external_account_id: job.external_account_id,
        external_ad_id: externalAdId,
        report_date: reportDate,
      },
    });

    const entity =
      performance ??
      this.adPerformanceRepository.create({
        provider: job.provider,
        external_account_id: job.external_account_id,
        external_ad_id: externalAdId,
        report_date: reportDate,
      });

    entity.external_campaign_id = row.campaign?.id ?? undefined;
    entity.campaign_name = row.campaign?.name ?? undefined;
    entity.external_adset_id = row.adGroup?.id ?? undefined;
    entity.adset_name = row.adGroup?.name ?? undefined;
    entity.ad_name = row.adGroupAd?.ad?.name ?? undefined;
    entity.impressions = String(row.metrics?.impressions ?? '0');
    entity.clicks = String(row.metrics?.clicks ?? '0');
    entity.spend = this.microsToDecimalString(row.metrics?.costMicros);
    entity.conversions =
      row.metrics?.conversions !== undefined
        ? String(row.metrics.conversions)
        : undefined;
    entity.metadata = row as unknown as Record<string, unknown>;

    await this.adPerformanceRepository.save(entity);
    return true;
  }

  private microsToDecimalString(costMicros?: string): string {
    const micros = BigInt(costMicros ?? '0');
    const whole = micros / 1000000n;
    const fraction = micros % 1000000n;
    return `${whole}.${fraction.toString().padStart(6, '0')}`;
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
