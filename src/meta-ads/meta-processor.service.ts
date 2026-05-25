import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { MetaAdPerformance } from '../database/entities/meta-ads/meta-ad-performance.entity';
import { MetaAdRaw } from '../database/entities/meta-ads/meta-ad-raw.entity';
import { MetaAdsetRaw } from '../database/entities/meta-ads/meta-adset-raw.entity';
import { MetaCampaignRaw } from '../database/entities/meta-ads/meta-campaign-raw.entity';
import {
  MetaAdRow,
  MetaAdsetRow,
  MetaCampaignRow,
  MetaInsightRow,
} from './meta-batch.service';

@Injectable()
export class MetaProcessorService {
  private readonly logger = new Logger(MetaProcessorService.name);

  constructor(
    @InjectRepository(MetaCampaignRaw)
    private readonly campaignRepo: Repository<MetaCampaignRaw>,
    @InjectRepository(MetaAdsetRaw)
    private readonly adsetRepo: Repository<MetaAdsetRaw>,
    @InjectRepository(MetaAdRaw)
    private readonly adRepo: Repository<MetaAdRaw>,
    @InjectRepository(MetaAdPerformance)
    private readonly performanceRepo: Repository<MetaAdPerformance>,
  ) {}

  // ─── Action extraction helpers ────────────────────────────────────────────

  private extractActionTotal(
    actions: Array<{ action_type: string; value: string }> | undefined,
    types: string[],
  ): number {
    if (!actions) return 0;
    return actions
      .filter((a) => types.includes(a.action_type))
      .reduce((sum, a) => sum + parseFloat(a.value || '0'), 0);
  }

  private firstVideoMetricValue(
    field: Array<{ action_type: string; value: string }> | undefined,
  ): string | undefined {
    if (!field || field.length === 0) return undefined;
    return field[0].value;
  }

  private computeConnectRate(
    landingPageViews: number,
    linkClicks: number,
  ): string | undefined {
    if (linkClicks <= 0) return undefined;
    return (landingPageViews / linkClicks).toFixed(6);
  }

  // ─── Campaigns ────────────────────────────────────────────────────────────

  async saveCampaigns(
    accountId: string,
    campaigns: MetaCampaignRow[],
  ): Promise<number> {
    if (campaigns.length === 0) return 0;

    let saved = 0;
    for (const c of campaigns) {
      if (!c.id) continue;
      await this.campaignRepo.upsert(
        {
          external_account_id: accountId,
          external_campaign_id: c.id,
          campaign_name: c.name ?? c.campaign_name,
          status: typeof c.status === 'string' ? c.status : undefined,
          effective_status:
            typeof c.effective_status === 'string'
              ? c.effective_status
              : undefined,
          objective: typeof c.objective === 'string' ? c.objective : undefined,
          payload: c as Record<string, unknown>,
        } as QueryDeepPartialEntity<MetaCampaignRaw>,
        {
          conflictPaths: ['external_account_id', 'external_campaign_id'],
          skipUpdateIfNoValuesChanged: false,
        },
      );
      saved++;
    }

    this.logger.log(`Saved ${saved} campaigns for account ${accountId}`);
    return saved;
  }

  // ─── Adsets ───────────────────────────────────────────────────────────────

  async saveAdsets(accountId: string, adsets: MetaAdsetRow[]): Promise<number> {
    if (adsets.length === 0) return 0;

    let saved = 0;
    for (const a of adsets) {
      if (!a.id) continue;
      await this.adsetRepo.upsert(
        {
          external_account_id: accountId,
          external_adset_id: a.id,
          external_campaign_id:
            typeof a.campaign_id === 'string' ? a.campaign_id : undefined,
          adset_name: a.name ?? a.adset_name,
          status: typeof a.status === 'string' ? a.status : undefined,
          effective_status:
            typeof a.effective_status === 'string'
              ? a.effective_status
              : undefined,
          payload: a as Record<string, unknown>,
        } as QueryDeepPartialEntity<MetaAdsetRaw>,
        {
          conflictPaths: ['external_account_id', 'external_adset_id'],
          skipUpdateIfNoValuesChanged: false,
        },
      );
      saved++;
    }

    this.logger.log(`Saved ${saved} adsets for account ${accountId}`);
    return saved;
  }

  // ─── Ads ──────────────────────────────────────────────────────────────────

  async saveAds(accountId: string, ads: MetaAdRow[]): Promise<number> {
    if (ads.length === 0) return 0;

    let saved = 0;
    for (const ad of ads) {
      if (!ad.id) continue;
      const creative = ad.creative as Record<string, unknown> | undefined;
      await this.adRepo.upsert(
        {
          external_account_id: accountId,
          external_ad_id: ad.id,
          external_adset_id:
            typeof ad.adset_id === 'string' ? ad.adset_id : undefined,
          external_campaign_id:
            typeof ad.campaign_id === 'string' ? ad.campaign_id : undefined,
          ad_name: typeof ad.name === 'string' ? ad.name : undefined,
          status: typeof ad.status === 'string' ? ad.status : undefined,
          effective_status:
            typeof ad.effective_status === 'string'
              ? ad.effective_status
              : undefined,
          thumbnail_url:
            creative && typeof creative['image_url'] === 'string'
              ? creative['image_url']
              : undefined,
          payload: ad as Record<string, unknown>,
        } as QueryDeepPartialEntity<MetaAdRaw>,
        {
          conflictPaths: ['external_account_id', 'external_ad_id'],
          skipUpdateIfNoValuesChanged: false,
        },
      );
      saved++;
    }

    this.logger.log(`Saved ${saved} ads for account ${accountId}`);
    return saved;
  }

  // ─── Insights ─────────────────────────────────────────────────────────────

  async saveInsights(
    accountId: string,
    insights: MetaInsightRow[],
  ): Promise<number> {
    if (insights.length === 0) return 0;

    let saved = 0;
    for (const row of insights) {
      if (!row.ad_id || !row.date_start) continue;

      const landingPageViews = this.extractActionTotal(row.actions, [
        'landing_page_view',
      ]);
      const leads = this.extractActionTotal(row.actions, [
        'lead',
        'onsite_conversion.lead_grouped',
        'leadgen_grouped',
      ]);
      const initiateCheckouts = this.extractActionTotal(row.actions, [
        'initiate_checkout',
      ]);
      const purchases = this.extractActionTotal(row.actions, [
        'purchase',
        'omni_purchase',
      ]);

      const linkClicks = parseInt(row.inline_link_clicks ?? '0', 10);
      const connectRate = this.computeConnectRate(landingPageViews, linkClicks);
      const platform = row.publisher_platform ?? 'total';

      await this.performanceRepo.upsert(
        {
          external_account_id: accountId,
          account_name: row.account_name,
          external_campaign_id: row.campaign_id,
          campaign_name: row.campaign_name,
          external_adset_id: row.adset_id,
          adset_name: row.adset_name,
          external_ad_id: row.ad_id,
          ad_name: row.ad_name,
          report_date: row.date_start,
          publisher_platform: platform,
          impressions: row.impressions ?? '0',
          clicks: row.clicks ?? '0',
          reach: row.reach,
          inline_link_clicks: row.inline_link_clicks,
          spend: row.spend ?? '0',
          ctr: row.ctr,
          cpc: row.cpc,
          cpm: row.cpm,
          leads: String(leads),
          landing_page_views: String(landingPageViews),
          initiate_checkouts: String(initiateCheckouts),
          purchases: String(purchases),
          video_p25_watched: this.firstVideoMetricValue(
            row.video_p25_watched_actions,
          ),
          video_p50_watched: this.firstVideoMetricValue(
            row.video_p50_watched_actions,
          ),
          video_p75_watched: this.firstVideoMetricValue(
            row.video_p75_watched_actions,
          ),
          video_p100_watched: this.firstVideoMetricValue(
            row.video_p100_watched_actions,
          ),
          video_thruplay_watched: this.firstVideoMetricValue(
            row.video_thruplay_watched_actions,
          ),
          video_avg_time_watched: this.firstVideoMetricValue(
            row.video_avg_time_watched_actions,
          ),
          video_30s_watched: this.firstVideoMetricValue(
            row.video_30_sec_watched_actions,
          ),
          video_continuous_2s_watched: this.firstVideoMetricValue(
            row.video_continuous_2_sec_watched_actions,
          ),
          connect_rate: connectRate,
          metadata: row as unknown as Record<string, unknown>,
        } as QueryDeepPartialEntity<MetaAdPerformance>,
        {
          conflictPaths: [
            'external_account_id',
            'external_ad_id',
            'report_date',
            'publisher_platform',
          ],
          skipUpdateIfNoValuesChanged: false,
        },
      );
      saved++;
    }

    this.logger.log(`Saved ${saved} insight rows for account ${accountId}`);
    return saved;
  }
}
