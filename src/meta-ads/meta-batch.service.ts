import { Injectable, Logger } from '@nestjs/common';
import { MetaAdsOAuthService } from '../oauth/meta-ads-oauth.service';

export type BatchRequest = {
  method: string;
  relative_url: string;
};

export type BatchResponseItem = {
  code: number;
  headers: Array<{ name: string; value: string }>;
  body: string;
};

export type MetaCampaignRow = {
  id: string;
  name?: string;
  campaign_name?: string;
  status?: string;
  effective_status?: string;
  objective?: string;
  daily_budget?: string;
  spend_cap?: string;
  budget_type?: string;
  pacing_type?: string[];
  [key: string]: unknown;
};

export type MetaAdsetRow = {
  id: string;
  name?: string;
  adset_name?: string;
  campaign_id?: string;
  status?: string;
  effective_status?: string;
  daily_budget?: string;
  bid_strategy?: string;
  optimization_goal?: string;
  targeting?: Record<string, unknown>;
  [key: string]: unknown;
};

export type MetaAdRow = {
  id: string;
  name?: string;
  adset_id?: string;
  campaign_id?: string;
  status?: string;
  effective_status?: string;
  creative?: {
    id?: string;
    thumbnail_id?: string;
    image_url?: string;
    title?: string;
    body?: string;
    call_to_action_type?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type MetaInsightRow = {
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  account_name?: string;
  date_start?: string;
  impressions?: string;
  clicks?: string;
  reach?: string;
  inline_link_clicks?: string;
  spend?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  publisher_platform?: string;
  actions?: Array<{ action_type: string; value: string }>;
  video_p25_watched_actions?: Array<{ action_type: string; value: string }>;
  video_p50_watched_actions?: Array<{ action_type: string; value: string }>;
  video_p75_watched_actions?: Array<{ action_type: string; value: string }>;
  video_p100_watched_actions?: Array<{ action_type: string; value: string }>;
  video_thruplay_watched_actions?: Array<{ action_type: string; value: string }>;
  video_avg_time_watched_actions?: Array<{ action_type: string; value: string }>;
  video_30_sec_watched_actions?: Array<{ action_type: string; value: string }>;
  video_continuous_2_sec_watched_actions?: Array<{
    action_type: string;
    value: string;
  }>;
};

export type MetaPagedResponse<T> = {
  data: T[];
  paging?: {
    cursors?: { before?: string; after?: string };
    next?: string;
  };
};

const CAMPAIGN_FIELDS = [
  'id',
  'name',
  'campaign_name',
  'objective',
  'status',
  'effective_status',
  'daily_budget',
  'spend_cap',
  'budget_type',
  'pacing_type',
  'primary_attribution',
  'source_campaign_id',
  'special_ad_categories',
  'is_skadnetwork_attribution',
  'is_split_test',
  'issues_info',
].join(',');

const ADSET_FIELDS = [
  'id',
  'name',
  'campaign_id',
  'status',
  'effective_status',
  'daily_budget',
  'budget_remaining',
  'bid_strategy',
  'bid_amount',
  'billing_event',
  'optimization_goal',
  'destination_type',
  'end_time',
  'targeting',
  'adset_schedule',
  'learning_stage_info',
  'pacing_type',
  'issues_info',
].join(',');

const AD_FIELDS = [
  'id',
  'name',
  'adset_id',
  'campaign_id',
  'status',
  'effective_status',
  'recommendations',
  'creative{id,thumbnail_id,image_url,title,call_to_action_type,body}',
].join(',');

const INSIGHTS_FIELDS = [
  'campaign_id',
  'campaign_name',
  'adset_id',
  'adset_name',
  'ad_id',
  'ad_name',
  'account_name',
  'date_start',
  'date_stop',
  'impressions',
  'clicks',
  'reach',
  'inline_link_clicks',
  'spend',
  'ctr',
  'cpc',
  'cpm',
  'actions',
  'video_p25_watched_actions',
  'video_p50_watched_actions',
  'video_p75_watched_actions',
  'video_p100_watched_actions',
  'video_thruplay_watched_actions',
  'video_avg_time_watched_actions',
  'video_30_sec_watched_actions',
  'video_continuous_2_sec_watched_actions',
].join(',');

@Injectable()
export class MetaBatchService {
  private readonly logger = new Logger(MetaBatchService.name);

  constructor(private readonly metaOAuthService: MetaAdsOAuthService) {}

  private getBaseUrl() {
    return this.metaOAuthService.getGraphBaseUrl();
  }

  private async executeGraphBatch(
    accessToken: string,
    requests: BatchRequest[],
  ): Promise<BatchResponseItem[]> {
    const baseUrl = this.getBaseUrl();
    const url = new URL(baseUrl);

    const body = new URLSearchParams();
    body.set('access_token', accessToken);
    body.set('batch', JSON.stringify(requests));

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Meta Batch API error: ${response.status} ${text}`);
    }

    return (await response.json()) as BatchResponseItem[];
  }

  private parseBatchItem<T>(item: BatchResponseItem): MetaPagedResponse<T> | null {
    if (item.code !== 200) {
      this.logger.warn(`Batch item returned code ${item.code}: ${item.body}`);
      return null;
    }
    try {
      return JSON.parse(item.body) as MetaPagedResponse<T>;
    } catch {
      this.logger.warn(`Failed to parse batch item body: ${item.body}`);
      return null;
    }
  }

  private formatBatchErrorBody(body: string): string {
    try {
      const parsed = JSON.parse(body) as {
        error?: { message?: string; type?: string; code?: number; error_subcode?: number };
      };
      if (parsed.error?.message) {
        const parts = [
          parsed.error.message,
          parsed.error.type ? `type=${parsed.error.type}` : undefined,
          parsed.error.code ? `code=${parsed.error.code}` : undefined,
          parsed.error.error_subcode
            ? `subcode=${parsed.error.error_subcode}`
            : undefined,
        ].filter(Boolean);
        return parts.join(' ');
      }
    } catch {
      return body;
    }
    return body;
  }

  private buildDateParam(opts: {
    datePreset?: string;
    since?: string;
    until?: string;
  }): string {
    if (opts.since && opts.until) {
      return `time_range=${encodeURIComponent(JSON.stringify({ since: opts.since, until: opts.until }))}`;
    }
    return `date_preset=${opts.datePreset ?? 'last_30d'}`;
  }

  async fetchCampaignsBatch(params: {
    connectionId: string;
    accountIds: string[];
    datePreset?: string;
    since?: string;
    until?: string;
  }): Promise<Array<{ accountId: string; campaigns: MetaCampaignRow[] }>> {
    const accessToken = await this.metaOAuthService.getAuthorizedAccessTokenForConnection(
      params.connectionId,
    );

    const dateParam = this.buildDateParam(params);
    const requests: BatchRequest[] = params.accountIds.map((accountId) => ({
      method: 'GET',
      relative_url: `act_${accountId}/campaigns?fields=${CAMPAIGN_FIELDS}&${dateParam}&limit=500`,
    }));

    const responses = await this.executeGraphBatch(accessToken, requests);

    return responses.map((item, idx) => {
      const parsed = this.parseBatchItem<MetaCampaignRow>(item);
      return {
        accountId: params.accountIds[idx],
        campaigns: parsed?.data ?? [],
      };
    });
  }

  async fetchAdsetsBatch(params: {
    connectionId: string;
    accountIds: string[];
    datePreset?: string;
    since?: string;
    until?: string;
  }): Promise<Array<{ accountId: string; adsets: MetaAdsetRow[] }>> {
    const accessToken = await this.metaOAuthService.getAuthorizedAccessTokenForConnection(
      params.connectionId,
    );

    const dateParam = this.buildDateParam(params);
    const requests: BatchRequest[] = params.accountIds.map((accountId) => ({
      method: 'GET',
      relative_url: `act_${accountId}/adsets?fields=${ADSET_FIELDS}&${dateParam}&limit=500`,
    }));

    const responses = await this.executeGraphBatch(accessToken, requests);

    return responses.map((item, idx) => {
      const parsed = this.parseBatchItem<MetaAdsetRow>(item);
      return {
        accountId: params.accountIds[idx],
        adsets: parsed?.data ?? [],
      };
    });
  }

  async fetchAdsBatch(params: {
    connectionId: string;
    accountIds: string[];
    datePreset?: string;
    since?: string;
    until?: string;
  }): Promise<Array<{ accountId: string; ads: MetaAdRow[] }>> {
    const accessToken = await this.metaOAuthService.getAuthorizedAccessTokenForConnection(
      params.connectionId,
    );

    const dateParam = this.buildDateParam(params);
    const requests: BatchRequest[] = params.accountIds.map((accountId) => ({
      method: 'GET',
      relative_url: `act_${accountId}/ads?fields=${AD_FIELDS}&${dateParam}&limit=500`,
    }));

    const responses = await this.executeGraphBatch(accessToken, requests);

    return responses.map((item, idx) => {
      const parsed = this.parseBatchItem<MetaAdRow>(item);
      return {
        accountId: params.accountIds[idx],
        ads: parsed?.data ?? [],
      };
    });
  }

  async fetchInsightsBatch(params: {
    connectionId: string;
    accountIds: string[];
    datePreset?: string;
    since?: string;
    until?: string;
    level?: 'ad' | 'adset' | 'campaign';
    breakdowns?: string;
    timeIncrement?: number;
  }): Promise<Array<{ accountId: string; insights: MetaInsightRow[] }>> {
    const accessToken = await this.metaOAuthService.getAuthorizedAccessTokenForConnection(
      params.connectionId,
    );

    const level = params.level ?? 'ad';
    const timeIncrement = params.timeIncrement ?? 1;
    const breakdowns = params.breakdowns ?? 'publisher_platform';
    const dateParam = this.buildDateParam(params);

    const requests: BatchRequest[] = params.accountIds.map((accountId) => ({
      method: 'GET',
      relative_url: [
        `act_${accountId}/insights`,
        `?level=${level}`,
        `&fields=${INSIGHTS_FIELDS}`,
        `&breakdowns=${breakdowns}`,
        `&time_increment=${timeIncrement}`,
        `&${dateParam}`,
        `&limit=500`,
      ].join(''),
    }));

    const responses = await this.executeGraphBatch(accessToken, requests);

    return responses.map((item, idx) => {
      const accountId = params.accountIds[idx];
      if (item.code !== 200) {
        throw new Error(
          `Meta insights batch failed for account ${accountId}: ${item.code} ${this.formatBatchErrorBody(item.body)}`,
        );
      }

      let parsed: MetaPagedResponse<MetaInsightRow>;
      try {
        parsed = JSON.parse(item.body) as MetaPagedResponse<MetaInsightRow>;
      } catch {
        throw new Error(
          `Meta insights batch returned invalid JSON for account ${accountId}: ${item.body}`,
        );
      }

      return {
        accountId,
        insights: parsed?.data ?? [],
      };
    });
  }
}
