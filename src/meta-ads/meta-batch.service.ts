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
  video_thruplay_watched_actions?: Array<{
    action_type: string;
    value: string;
  }>;
  video_avg_time_watched_actions?: Array<{
    action_type: string;
    value: string;
  }>;
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

// Usado no retry de contas grandes — sem métricas de vídeo para reduzir payload
const INSIGHTS_FIELDS_SLIM = [
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

  private parseBatchItem<T>(
    item: BatchResponseItem,
  ): MetaPagedResponse<T> | null {
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
        error?: {
          message?: string;
          type?: string;
          code?: number;
          error_subcode?: number;
        };
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
    const accessToken =
      await this.metaOAuthService.getAuthorizedAccessTokenForConnection(
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
    const accessToken =
      await this.metaOAuthService.getAuthorizedAccessTokenForConnection(
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
    const accessToken =
      await this.metaOAuthService.getAuthorizedAccessTokenForConnection(
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

  private buildInsightUrl(
    accountId: string,
    level: string,
    breakdowns: string,
    timeIncrement: number,
    dateParam: string,
    limit: number,
    slim = false,
  ): string {
    return [
      `act_${accountId}/insights`,
      `?level=${level}`,
      `&fields=${slim ? INSIGHTS_FIELDS_SLIM : INSIGHTS_FIELDS}`,
      `&breakdowns=${breakdowns}`,
      `&time_increment=${timeIncrement}`,
      `&${dateParam}`,
      `&limit=${limit}`,
    ].join('');
  }

  private async fetchInsightsSingleAccount(
    accessToken: string,
    accountId: string,
    level: string,
    breakdowns: string,
    timeIncrement: number,
    dateParam: string,
  ): Promise<MetaInsightRow[]> {
    // First try with full fields at decreasing limits
    const fullLimits = [100, 50, 20];
    for (const limit of fullLimits) {
      const [response] = await this.executeGraphBatch(accessToken, [
        {
          method: 'GET',
          relative_url: this.buildInsightUrl(
            accountId, level, breakdowns, timeIncrement, dateParam, limit,
          ),
        },
      ]);
      if (response.code === 200) {
        const parsed = JSON.parse(response.body) as MetaPagedResponse<MetaInsightRow>;
        this.logger.log(`[retry full limit=${limit}] account ${accountId}: ${parsed.data?.length ?? 0} rows`);
        return parsed.data ?? [];
      }
      const errMsg = this.formatBatchErrorBody(response.body);
      if (response.code === 500 && errMsg.includes('code=1')) {
        this.logger.warn(`account ${accountId} too large at full limit=${limit}, retrying smaller`);
        continue;
      }
      this.logger.error(`account ${accountId} retry failed (limit=${limit}): ${response.code} ${errMsg}`);
      return [];
    }

    // Full fields exhausted — retry with slim fields (no video metrics)
    this.logger.warn(`account ${accountId} switching to slim fields (no video metrics)`);
    const slimLimits = [200, 100, 50];
    for (const limit of slimLimits) {
      const [response] = await this.executeGraphBatch(accessToken, [
        {
          method: 'GET',
          relative_url: this.buildInsightUrl(
            accountId, level, breakdowns, timeIncrement, dateParam, limit, true,
          ),
        },
      ]);
      if (response.code === 200) {
        const parsed = JSON.parse(response.body) as MetaPagedResponse<MetaInsightRow>;
        this.logger.log(`[retry slim limit=${limit}] account ${accountId}: ${parsed.data?.length ?? 0} rows`);
        return parsed.data ?? [];
      }
      const errMsg = this.formatBatchErrorBody(response.body);
      if (response.code === 500 && errMsg.includes('code=1')) {
        this.logger.warn(`account ${accountId} still too large at slim limit=${limit}`);
        continue;
      }
      this.logger.error(`account ${accountId} slim retry failed (limit=${limit}): ${response.code} ${errMsg}`);
      return [];
    }

    this.logger.error(`account ${accountId} exhausted all retry strategies, skipping`);
    return [];
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
    chunkSize?: number;
    chunkDelayMs?: number;
  }): Promise<Array<{ accountId: string; insights: MetaInsightRow[] }>> {
    const accessToken =
      await this.metaOAuthService.getAuthorizedAccessTokenForConnection(
        params.connectionId,
      );

    const level = params.level ?? 'ad';
    const timeIncrement = params.timeIncrement ?? 1;
    const breakdowns = params.breakdowns ?? 'publisher_platform';
    const dateParam = this.buildDateParam(params);
    const chunkSize = params.chunkSize ?? 5;
    const chunkDelayMs = params.chunkDelayMs ?? 1000;

    const chunks: string[][] = [];
    for (let i = 0; i < params.accountIds.length; i += chunkSize) {
      chunks.push(params.accountIds.slice(i, i + chunkSize));
    }

    this.logger.log(
      `Starting insights fetch: ${params.accountIds.length} accounts in ${chunks.length} chunks of ${chunkSize}`,
    );

    const allResults: Array<{ accountId: string; insights: MetaInsightRow[] }> =
      [];

    for (let ci = 0; ci < chunks.length; ci++) {
      const chunk = chunks[ci];
      this.logger.log(
        `Chunk ${ci + 1}/${chunks.length}: accounts [${chunk.join(', ')}]`,
      );

      if (ci > 0) {
        await new Promise((r) => setTimeout(r, chunkDelayMs));
      }

      const requests: BatchRequest[] = chunk.map((accountId) => ({
        method: 'GET',
        relative_url: this.buildInsightUrl(
          accountId,
          level,
          breakdowns,
          timeIncrement,
          dateParam,
          200,
        ),
      }));

      const responses = await this.executeGraphBatch(accessToken, requests);

      for (let idx = 0; idx < responses.length; idx++) {
        const item = responses[idx];
        const accountId = chunk[idx];

        if (item.code === 200) {
          let parsed: MetaPagedResponse<MetaInsightRow>;
          try {
            parsed = JSON.parse(item.body) as MetaPagedResponse<MetaInsightRow>;
          } catch {
            this.logger.error(
              `Invalid JSON for account ${accountId}: ${item.body}`,
            );
            allResults.push({ accountId, insights: [] });
            continue;
          }
          this.logger.log(
            `account ${accountId}: ${parsed.data?.length ?? 0} rows OK`,
          );
          allResults.push({ accountId, insights: parsed.data ?? [] });
          continue;
        }

        const errMsg = this.formatBatchErrorBody(item.body);
        // code=1 = too much data → retry individually with smaller limits
        if (item.code === 500 && errMsg.includes('code=1')) {
          this.logger.warn(
            `account ${accountId} too large (code=1), retrying individually`,
          );
          const insights = await this.fetchInsightsSingleAccount(
            accessToken,
            accountId,
            level,
            breakdowns,
            timeIncrement,
            dateParam,
          );
          allResults.push({ accountId, insights });
          continue;
        }

        this.logger.error(
          `Meta insights batch failed for account ${accountId}: ${item.code} ${errMsg}`,
        );
        allResults.push({ accountId, insights: [] });
      }
    }

    const succeeded = allResults.filter((r) => r.insights.length > 0).length;
    const totalRows = allResults.reduce((s, r) => s + r.insights.length, 0);
    this.logger.log(
      `Insights fetch done: ${succeeded}/${params.accountIds.length} accounts OK, ${totalRows} total rows`,
    );

    return allResults;
  }
}
