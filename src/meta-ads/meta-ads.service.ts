import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { OAuthConnection } from '../database/entities/integrations/oauth-connection.entity';
import { MarketingConnectionAccount } from '../database/entities/marketing-sync/marketing-connection-account.entity';
import { MetaAdPerformance } from '../database/entities/meta-ads/meta-ad-performance.entity';
import { MetaAdRaw } from '../database/entities/meta-ads/meta-ad-raw.entity';
import { MetaAdsetRaw } from '../database/entities/meta-ads/meta-adset-raw.entity';
import { MetaCampaignRaw } from '../database/entities/meta-ads/meta-campaign-raw.entity';
import {
  MetaSyncExecution,
  MetaSyncExecutionStep,
} from '../database/entities/meta-ads/meta-sync-execution.entity';
import { AsyncJobStatus, MetaJobService } from './meta-job.service';
import { MetaBatchService } from './meta-batch.service';
import { MetaProcessorService } from './meta-processor.service';

@Injectable()
export class MetaAdsService {
  private readonly logger = new Logger(MetaAdsService.name);
  private readonly abortRequests = new Set<string>();

  constructor(
    @InjectRepository(OAuthConnection)
    private readonly connectionRepo: Repository<OAuthConnection>,
    @InjectRepository(MarketingConnectionAccount)
    private readonly accountRepo: Repository<MarketingConnectionAccount>,
    @InjectRepository(MetaCampaignRaw)
    private readonly campaignRepo: Repository<MetaCampaignRaw>,
    @InjectRepository(MetaAdsetRaw)
    private readonly adsetRepo: Repository<MetaAdsetRaw>,
    @InjectRepository(MetaAdRaw)
    private readonly adRepo: Repository<MetaAdRaw>,
    @InjectRepository(MetaAdPerformance)
    private readonly performanceRepo: Repository<MetaAdPerformance>,
    @InjectRepository(MetaSyncExecution)
    private readonly executionRepo: Repository<MetaSyncExecution>,
    private readonly batchService: MetaBatchService,
    private readonly jobService: MetaJobService,
    private readonly processor: MetaProcessorService,
  ) {}

  // ─── Connection helpers ───────────────────────────────────────────────────

  private async getActiveMetaConnections(): Promise<OAuthConnection[]> {
    return this.connectionRepo.find({
      where: { provider: 'meta_ads', status: 'active' },
    });
  }

  private async getSelectedMetaAccountIds(
    connectionId?: string,
  ): Promise<Array<{ connectionId: string; accountId: string }>> {
    const where: FindOptionsWhere<MarketingConnectionAccount> = {
      provider: 'meta_ads',
      selected: true,
    };
    if (connectionId) {
      where.oauth_connection = { id: connectionId };
    }

    const accounts = await this.accountRepo.find({
      where,
      relations: ['oauth_connection'],
    });

    return accounts.map((a) => ({
      connectionId: a.oauth_connection.id,
      accountId: a.external_account_id,
    }));
  }

  // ─── Execution log ────────────────────────────────────────────────────────

  private async startExecution(
    step: MetaSyncExecutionStep,
    triggeredBy: string,
    opts?: { accountId?: string; dateFrom?: string; dateTo?: string },
  ): Promise<MetaSyncExecution> {
    return this.executionRepo.save(
      this.executionRepo.create({
        step,
        triggered_by: triggeredBy,
        status: 'running',
        external_account_id: opts?.accountId,
        date_from: opts?.dateFrom,
        date_to: opts?.dateTo,
      }),
    );
  }

  private async finishExecution(
    execution: MetaSyncExecution,
    result: { records: number; error?: string },
  ): Promise<void> {
    execution.status = result.error ? 'failed' : 'completed';
    execution.records_processed = result.records;
    execution.error_message = result.error;
    execution.finished_at = new Date();
    await this.executionRepo.save(execution);
  }

  // ─── Campaigns ────────────────────────────────────────────────────────────

  async syncCampaigns(params: {
    triggeredBy?: string;
    connectionId?: string;
    accountIds?: string[];
    datePreset?: string;
    since?: string;
    until?: string;
  }): Promise<{ total: number; executionId: string }> {
    const execution = await this.startExecution(
      'campaigns',
      params.triggeredBy ?? 'http',
    );

    try {
      const targets = await this.resolveTargets(params);
      let total = 0;

      for (const { connectionId, accountIds } of targets) {
        const results = await this.batchService.fetchCampaignsBatch({
          connectionId,
          accountIds,
          datePreset: params.datePreset,
          since: params.since,
          until: params.until,
        });

        for (const { accountId, campaigns } of results) {
          total += await this.processor.saveCampaigns(accountId, campaigns);
        }
      }

      await this.finishExecution(execution, { records: total });
      return { total, executionId: execution.id };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.finishExecution(execution, { records: 0, error: msg });
      throw err;
    }
  }

  async syncAdsets(params: {
    triggeredBy?: string;
    connectionId?: string;
    accountIds?: string[];
    datePreset?: string;
    since?: string;
    until?: string;
  }): Promise<{ total: number; executionId: string }> {
    const execution = await this.startExecution(
      'adsets',
      params.triggeredBy ?? 'http',
    );

    try {
      const targets = await this.resolveTargets(params);
      let total = 0;

      for (const { connectionId, accountIds } of targets) {
        const results = await this.batchService.fetchAdsetsBatch({
          connectionId,
          accountIds,
          datePreset: params.datePreset,
          since: params.since,
          until: params.until,
        });

        for (const { accountId, adsets } of results) {
          total += await this.processor.saveAdsets(accountId, adsets);
        }
      }

      await this.finishExecution(execution, { records: total });
      return { total, executionId: execution.id };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.finishExecution(execution, { records: 0, error: msg });
      throw err;
    }
  }

  async syncAds(params: {
    triggeredBy?: string;
    connectionId?: string;
    accountIds?: string[];
    datePreset?: string;
    since?: string;
    until?: string;
  }): Promise<{ total: number; executionId: string }> {
    const execution = await this.startExecution(
      'ads',
      params.triggeredBy ?? 'http',
    );

    try {
      const targets = await this.resolveTargets(params);
      let total = 0;

      for (const { connectionId, accountIds } of targets) {
        const results = await this.batchService.fetchAdsBatch({
          connectionId,
          accountIds,
          datePreset: params.datePreset,
          since: params.since,
          until: params.until,
        });

        for (const { accountId, ads } of results) {
          total += await this.processor.saveAds(accountId, ads);
        }
      }

      await this.finishExecution(execution, { records: total });
      return { total, executionId: execution.id };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.finishExecution(execution, { records: 0, error: msg });
      throw err;
    }
  }

  async syncInsights(params: {
    triggeredBy?: string;
    connectionId?: string;
    accountIds?: string[];
    datePreset?: string;
    since?: string;
    until?: string;
    level?: 'ad' | 'adset' | 'campaign';
    breakdowns?: string;
  }): Promise<{ total: number; executionId: string }> {
    const execution = await this.startExecution(
      'insights',
      params.triggeredBy ?? 'http',
      { dateFrom: params.since, dateTo: params.until },
    );

    const total = await this.runInsightsExecution(execution, params, true);
    return { total, executionId: execution.id };
  }

  async enqueueInsightsSync(params: {
    triggeredBy?: string;
    connectionId?: string;
    accountIds?: string[];
    datePreset?: string;
    since?: string;
    until?: string;
    level?: 'ad' | 'adset' | 'campaign';
    breakdowns?: string;
  }): Promise<{ queued: true; executionId: string }> {
    const execution = await this.startExecution(
      'insights',
      params.triggeredBy ?? 'http',
      { dateFrom: params.since, dateTo: params.until },
    );

    setImmediate(() => {
      void this.runInsightsExecution(execution, params, false);
    });

    return { queued: true, executionId: execution.id };
  }

  async enqueueInsightsBulkAsync(params: {
    triggeredBy?: string;
    connectionId?: string;
    accountIds?: string[];
    since: string;
    until: string;
    level?: string;
    breakdowns?: string;
    chunkDays?: number;
  }): Promise<{ queued: true; executionId: string; totalJobs: number }> {
    const targets = await this.resolveTargets(params);
    const chunks = this.chunkDateRange(
      params.since,
      params.until,
      params.chunkDays ?? 30,
    );
    const totalJobs =
      targets.reduce((sum, t) => sum + t.accountIds.length, 0) * chunks.length;

    const execution = await this.startExecution(
      'insights',
      params.triggeredBy ?? 'http',
      { dateFrom: params.since, dateTo: params.until },
    );

    setImmediate(() => {
      void this.runBulkAsyncInsights(execution, targets, chunks, {
        level: params.level ?? 'ad',
        breakdowns: params.breakdowns,
      });
    });

    return { queued: true, executionId: execution.id, totalJobs };
  }

  private chunkDateRange(
    since: string,
    until: string,
    chunkDays: number,
  ): Array<{ since: string; until: string }> {
    const chunks: Array<{ since: string; until: string }> = [];
    const current = new Date(since + 'T00:00:00Z');
    const end = new Date(until + 'T00:00:00Z');

    while (current <= end) {
      const chunkEnd = new Date(current);
      chunkEnd.setUTCDate(chunkEnd.getUTCDate() + chunkDays - 1);
      if (chunkEnd > end) chunkEnd.setTime(end.getTime());

      chunks.push({
        since: current.toISOString().slice(0, 10),
        until: chunkEnd.toISOString().slice(0, 10),
      });

      current.setUTCDate(current.getUTCDate() + chunkDays);
    }

    return chunks;
  }

  private async runBulkAsyncInsights(
    execution: MetaSyncExecution,
    targets: Array<{ connectionId: string; accountIds: string[] }>,
    chunks: Array<{ since: string; until: string }>,
    opts: { level: string; breakdowns?: string },
  ): Promise<void> {
    const defaultFields = [
      'campaign_id',
      'campaign_name',
      'adset_id',
      'adset_name',
      'ad_id',
      'ad_name',
      'impressions',
      'clicks',
      'reach',
      'spend',
      'ctr',
      'cpc',
      'cpm',
      'actions',
    ];

    const jobs: Array<{
      connectionId: string;
      accountId: string;
      since: string;
      until: string;
    }> = [];
    for (const { connectionId, accountIds } of targets) {
      for (const accountId of accountIds) {
        for (const chunk of chunks) {
          jobs.push({
            connectionId,
            accountId,
            since: chunk.since,
            until: chunk.until,
          });
        }
      }
    }

    let totalRecords = 0;
    let failedCount = 0;
    let doneCount = 0;
    const queue = [...jobs];
    const CONCURRENCY = 5;

    this.logger.log(
      `[BulkInsights ${execution.id}] Iniciando: ${jobs.length} jobs, ${Math.min(CONCURRENCY, jobs.length)} workers`,
    );

    const workers = Array.from(
      { length: Math.min(CONCURRENCY, jobs.length) },
      async () => {
        while (queue.length > 0) {
          if (this.abortRequests.has(execution.id)) {
            this.logger.warn(
              `[BulkInsights ${execution.id}] Worker detectou sinal de abort — parando`,
            );
            break;
          }

          const job = queue.shift();
          if (!job) break;

          const label = `conta=${job.accountId} [${job.since}→${job.until}]`;
          this.logger.log(`[BulkInsights ${execution.id}] Iniciando job: ${label}`);

          try {
            const { report_run_id } = await this.jobService.startInsightsJob({
              connectionId: job.connectionId,
              nodeId: `act_${job.accountId}`,
              fields: defaultFields,
              level: opts.level,
              since: job.since,
              until: job.until,
              breakdowns: opts.breakdowns,
            });

            this.logger.log(
              `[BulkInsights ${execution.id}] Job Meta criado: ${report_run_id} — aguardando...`,
            );

            const rows = await this.jobService.waitForJobAndFetch({
              connectionId: job.connectionId,
              reportRunId: report_run_id,
              maxWaitMs: 180_000, // 3 min por job; chunks de 30 dias raramente precisam mais
            });

            const saved = await this.processor.saveInsights(
              job.accountId,
              rows,
            );
            totalRecords += saved;
            doneCount++;
            execution.records_processed = totalRecords;
            await this.executionRepo.save(execution);
            this.logger.log(
              `[BulkInsights ${execution.id}] ✓ ${label}: ${saved} registros salvos | progresso: ${doneCount}/${jobs.length} jobs, ${totalRecords} total`,
            );
          } catch (err: unknown) {
            failedCount++;
            doneCount++;
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(
              `[BulkInsights ${execution.id}] ✗ ${label}: ${msg} | progresso: ${doneCount}/${jobs.length} jobs`,
            );
          }
        }
      },
    );

    await Promise.all(workers);

    const wasAborted = this.abortRequests.delete(execution.id);

    execution.finished_at = new Date();
    execution.records_processed = totalRecords;

    this.logger.log(
      `[BulkInsights ${execution.id}] Finalizado: ${totalRecords} registros, ${failedCount} falhas, abortado=${wasAborted}`,
    );

    if (wasAborted) {
      execution.status = 'aborted';
      execution.error_message = 'Abortado pelo usuário';
    } else if (failedCount === 0) {
      execution.status = 'completed';
    } else if (totalRecords > 0) {
      execution.status = 'partial';
      execution.error_message = `${failedCount} de ${jobs.length} jobs falharam`;
    } else {
      execution.status = 'failed';
      execution.error_message = `Todos os ${jobs.length} jobs falharam`;
    }

    await this.executionRepo.save(execution);
  }

  private async runInsightsExecution(
    execution: MetaSyncExecution,
    params: {
      connectionId?: string;
      accountIds?: string[];
      datePreset?: string;
      since?: string;
      until?: string;
      level?: 'ad' | 'adset' | 'campaign';
      breakdowns?: string;
    },
    throwOnError: boolean,
  ): Promise<number> {
    try {
      const targets = await this.resolveTargets(params);
      let total = 0;

      for (const { connectionId, accountIds } of targets) {
        const results = await this.batchService.fetchInsightsBatch({
          connectionId,
          accountIds,
          datePreset: params.datePreset,
          since: params.since,
          until: params.until,
          level: params.level,
          breakdowns: params.breakdowns,
        });

        for (const { accountId, insights } of results) {
          total += await this.processor.saveInsights(accountId, insights);
        }
      }

      await this.finishExecution(execution, { records: total });
      return total;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.finishExecution(execution, { records: 0, error: msg });
      this.logger.error(`Meta insights sync failed: ${msg}`);
      if (throwOnError) throw err;
      return 0;
    }
  }

  // ─── Full sync (all steps) ────────────────────────────────────────────────

  async syncAll(params: {
    triggeredBy?: string;
    connectionId?: string;
    datePreset?: string;
    since?: string;
    until?: string;
  }): Promise<{
    campaigns: number;
    adsets: number;
    ads: number;
    insights: number;
  }> {
    const [c, a, ad, i] = await Promise.allSettled([
      this.syncCampaigns(params),
      this.syncAdsets(params),
      this.syncAds(params),
      this.syncInsights(params),
    ]);

    return {
      campaigns: c.status === 'fulfilled' ? c.value.total : 0,
      adsets: a.status === 'fulfilled' ? a.value.total : 0,
      ads: ad.status === 'fulfilled' ? ad.value.total : 0,
      insights: i.status === 'fulfilled' ? i.value.total : 0,
    };
  }

  // ─── Async job endpoints ──────────────────────────────────────────────────

  async startInsightsJob(params: {
    connectionId: string;
    nodeId: string;
    fields?: string[];
    level: string;
    since: string;
    until: string;
    breakdowns?: string;
  }): Promise<{ report_run_id: string }> {
    const defaultFields = [
      'campaign_id',
      'campaign_name',
      'adset_id',
      'adset_name',
      'ad_id',
      'ad_name',
      'impressions',
      'clicks',
      'reach',
      'spend',
      'ctr',
      'cpc',
      'cpm',
      'actions',
    ];
    return this.jobService.startInsightsJob({
      connectionId: params.connectionId,
      nodeId: params.nodeId,
      fields: params.fields ?? defaultFields,
      level: params.level,
      since: params.since,
      until: params.until,
      breakdowns: params.breakdowns,
    });
  }

  async checkAsyncJob(params: {
    connectionId: string;
    reportRunId: string;
  }): Promise<AsyncJobStatus> {
    return this.jobService.checkJob(params);
  }

  async getAsyncJobResults(params: {
    connectionId: string;
    reportRunId: string;
    accountId?: string;
    save?: boolean;
  }): Promise<{ data: unknown[]; saved?: number }> {
    const rows = await this.jobService.getJobResults({
      connectionId: params.connectionId,
      reportRunId: params.reportRunId,
    });

    if (params.save && params.accountId) {
      const saved = await this.processor.saveInsights(params.accountId, rows);
      return { data: rows, saved };
    }

    return { data: rows };
  }

  // ─── Data query endpoints ─────────────────────────────────────────────────

  async getCampaigns(params: {
    accountId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: FindOptionsWhere<MetaCampaignRaw> = {};
    if (params.accountId) where.external_account_id = params.accountId;
    if (params.status) where.effective_status = params.status;

    const [items, total] = await this.campaignRepo.findAndCount({
      where,
      take: params.limit ?? 100,
      skip: params.offset ?? 0,
      order: { fetched_at: 'DESC' },
    });

    return { items, total };
  }

  async getAdsets(params: {
    accountId?: string;
    campaignId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: FindOptionsWhere<MetaAdsetRaw> = {};
    if (params.accountId) where.external_account_id = params.accountId;
    if (params.campaignId) where.external_campaign_id = params.campaignId;
    if (params.status) where.effective_status = params.status;

    const [items, total] = await this.adsetRepo.findAndCount({
      where,
      take: params.limit ?? 100,
      skip: params.offset ?? 0,
      order: { fetched_at: 'DESC' },
    });

    return { items, total };
  }

  async getAds(params: {
    accountId?: string;
    campaignId?: string;
    adsetId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: FindOptionsWhere<MetaAdRaw> = {};
    if (params.accountId) where.external_account_id = params.accountId;
    if (params.campaignId) where.external_campaign_id = params.campaignId;
    if (params.adsetId) where.external_adset_id = params.adsetId;
    if (params.status) where.effective_status = params.status;

    const [items, total] = await this.adRepo.findAndCount({
      where,
      take: params.limit ?? 100,
      skip: params.offset ?? 0,
      order: { fetched_at: 'DESC' },
    });

    return { items, total };
  }

  async getPerformance(params: {
    accountId?: string;
    campaignId?: string;
    adsetId?: string;
    adId?: string;
    dateFrom?: string;
    dateTo?: string;
    platform?: string;
    limit?: number;
    offset?: number;
  }) {
    const qb = this.performanceRepo.createQueryBuilder('p');

    if (params.accountId)
      qb.andWhere('p.external_account_id = :accountId', {
        accountId: params.accountId,
      });
    if (params.campaignId)
      qb.andWhere('p.external_campaign_id = :campaignId', {
        campaignId: params.campaignId,
      });
    if (params.adsetId)
      qb.andWhere('p.external_adset_id = :adsetId', {
        adsetId: params.adsetId,
      });
    if (params.adId)
      qb.andWhere('p.external_ad_id = :adId', { adId: params.adId });
    if (params.platform)
      qb.andWhere('p.publisher_platform = :platform', {
        platform: params.platform,
      });
    if (params.dateFrom)
      qb.andWhere('p.report_date >= :dateFrom', { dateFrom: params.dateFrom });
    if (params.dateTo)
      qb.andWhere('p.report_date <= :dateTo', { dateTo: params.dateTo });

    qb.orderBy('p.report_date', 'DESC')
      .take(params.limit ?? 500)
      .skip(params.offset ?? 0);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async getPerformanceSummary(params: {
    accountId?: string;
    campaignId?: string;
    dateFrom?: string;
    dateTo?: string;
    platform?: string;
  }) {
    const qb = this.performanceRepo
      .createQueryBuilder('p')
      .select('SUM(p.impressions::bigint)', 'total_impressions')
      .addSelect('SUM(p.clicks::bigint)', 'total_clicks')
      .addSelect('SUM(p.inline_link_clicks::bigint)', 'total_link_clicks')
      .addSelect('SUM(p.reach::bigint)', 'total_reach')
      .addSelect('SUM(p.spend::numeric)', 'total_spend')
      .addSelect('SUM(p.leads::numeric)', 'total_leads')
      .addSelect(
        'SUM(p.landing_page_views::bigint)',
        'total_landing_page_views',
      )
      .addSelect(
        'SUM(p.initiate_checkouts::bigint)',
        'total_initiate_checkouts',
      )
      .addSelect('SUM(p.purchases::bigint)', 'total_purchases')
      .addSelect(
        'SUM(p.video_thruplay_watched::bigint)',
        'total_video_thruplay',
      );

    if (params.accountId)
      qb.andWhere('p.external_account_id = :accountId', {
        accountId: params.accountId,
      });
    if (params.campaignId)
      qb.andWhere('p.external_campaign_id = :campaignId', {
        campaignId: params.campaignId,
      });
    if (params.platform)
      qb.andWhere('p.publisher_platform = :platform', {
        platform: params.platform,
      });
    if (params.dateFrom)
      qb.andWhere('p.report_date >= :dateFrom', { dateFrom: params.dateFrom });
    if (params.dateTo)
      qb.andWhere('p.report_date <= :dateTo', { dateTo: params.dateTo });

    const raw = await qb.getRawOne<Record<string, string>>();

    const impressions = parseInt(raw?.['total_impressions'] ?? '0', 10);
    const clicks = parseInt(raw?.['total_clicks'] ?? '0', 10);
    const linkClicks = parseInt(raw?.['total_link_clicks'] ?? '0', 10);
    const spend = parseFloat(raw?.['total_spend'] ?? '0');
    const leads = parseFloat(raw?.['total_leads'] ?? '0');
    const landingPageViews = parseInt(
      raw?.['total_landing_page_views'] ?? '0',
      10,
    );
    const initiateCheckouts = parseInt(
      raw?.['total_initiate_checkouts'] ?? '0',
      10,
    );
    const purchases = parseInt(raw?.['total_purchases'] ?? '0', 10);
    const videoThruplay = parseInt(raw?.['total_video_thruplay'] ?? '0', 10);

    return {
      impressions,
      clicks,
      link_clicks: linkClicks,
      reach: parseInt(raw?.['total_reach'] ?? '0', 10),
      spend,
      leads,
      landing_page_views: landingPageViews,
      initiate_checkouts: initiateCheckouts,
      purchases,
      video_thruplay: videoThruplay,
      // Computed metrics
      ctr: impressions > 0 ? ((clicks / impressions) * 100).toFixed(4) : null,
      cpc: clicks > 0 ? (spend / clicks).toFixed(4) : null,
      cpm: impressions > 0 ? ((spend / impressions) * 1000).toFixed(4) : null,
      connect_rate:
        linkClicks > 0 ? (landingPageViews / linkClicks).toFixed(4) : null,
      checkout_rate:
        landingPageViews > 0
          ? (initiateCheckouts / landingPageViews).toFixed(4)
          : null,
      cpl: leads > 0 ? (spend / leads).toFixed(4) : null,
    };
  }

  async getPerformanceTimeseries(params: {
    accountId?: string;
    campaignId?: string;
    dateFrom?: string;
    dateTo?: string;
    platform?: string;
  }) {
    const qb = this.performanceRepo
      .createQueryBuilder('p')
      .select('p.report_date', 'date')
      .addSelect('SUM(p.impressions::bigint)', 'impressions')
      .addSelect('SUM(p.clicks::bigint)', 'clicks')
      .addSelect('SUM(p.spend::numeric)', 'spend')
      .addSelect('SUM(p.leads::numeric)', 'leads')
      .addSelect('SUM(p.landing_page_views::bigint)', 'landing_page_views')
      .addSelect('SUM(p.initiate_checkouts::bigint)', 'initiate_checkouts')
      .groupBy('p.report_date')
      .orderBy('p.report_date', 'ASC');

    if (params.accountId)
      qb.andWhere('p.external_account_id = :accountId', {
        accountId: params.accountId,
      });
    if (params.campaignId)
      qb.andWhere('p.external_campaign_id = :campaignId', {
        campaignId: params.campaignId,
      });
    if (params.platform)
      qb.andWhere('p.publisher_platform = :platform', {
        platform: params.platform,
      });
    if (params.dateFrom)
      qb.andWhere('p.report_date >= :dateFrom', { dateFrom: params.dateFrom });
    if (params.dateTo)
      qb.andWhere('p.report_date <= :dateTo', { dateTo: params.dateTo });

    const rows = await qb.getRawMany<Record<string, string>>();

    return rows.map((r) => {
      const imp = parseInt(r['impressions'] ?? '0', 10);
      const cli = parseInt(r['clicks'] ?? '0', 10);
      const spd = parseFloat(r['spend'] ?? '0');
      const lpv = parseInt(r['landing_page_views'] ?? '0', 10);

      return {
        date: r['date'],
        impressions: imp,
        clicks: cli,
        spend: spd,
        leads: parseFloat(r['leads'] ?? '0'),
        landing_page_views: lpv,
        initiate_checkouts: parseInt(r['initiate_checkouts'] ?? '0', 10),
        ctr: imp > 0 ? ((cli / imp) * 100).toFixed(4) : null,
        cpm: imp > 0 ? ((spd / imp) * 1000).toFixed(4) : null,
        connect_rate: cli > 0 ? (lpv / cli).toFixed(4) : null,
      };
    });
  }

  async getCampaignBreakdown(params: {
    accountId?: string;
    dateFrom?: string;
    dateTo?: string;
    platform?: string;
  }) {
    const qb = this.performanceRepo
      .createQueryBuilder('p')
      .select('p.external_campaign_id', 'campaign_id')
      .addSelect('MAX(p.campaign_name)', 'campaign_name')
      .addSelect('SUM(p.impressions::bigint)', 'impressions')
      .addSelect('SUM(p.clicks::bigint)', 'clicks')
      .addSelect('SUM(p.spend::numeric)', 'spend')
      .addSelect('SUM(p.leads::numeric)', 'leads')
      .addSelect('SUM(p.landing_page_views::bigint)', 'landing_page_views')
      .addSelect('SUM(p.initiate_checkouts::bigint)', 'initiate_checkouts')
      .groupBy('p.external_campaign_id')
      .orderBy('SUM(p.spend::numeric)', 'DESC');

    if (params.accountId)
      qb.andWhere('p.external_account_id = :accountId', {
        accountId: params.accountId,
      });
    if (params.platform)
      qb.andWhere('p.publisher_platform = :platform', {
        platform: params.platform,
      });
    if (params.dateFrom)
      qb.andWhere('p.report_date >= :dateFrom', { dateFrom: params.dateFrom });
    if (params.dateTo)
      qb.andWhere('p.report_date <= :dateTo', { dateTo: params.dateTo });

    const rows = await qb.getRawMany<Record<string, string>>();

    return rows.map((r) => {
      const imp = parseInt(r['impressions'] ?? '0', 10);
      const cli = parseInt(r['clicks'] ?? '0', 10);
      const spd = parseFloat(r['spend'] ?? '0');
      const leads = parseFloat(r['leads'] ?? '0');
      const lpv = parseInt(r['landing_page_views'] ?? '0', 10);

      return {
        campaign_id: r['campaign_id'],
        campaign_name: r['campaign_name'],
        impressions: imp,
        clicks: cli,
        spend: spd,
        leads,
        landing_page_views: lpv,
        initiate_checkouts: parseInt(r['initiate_checkouts'] ?? '0', 10),
        ctr: imp > 0 ? ((cli / imp) * 100).toFixed(4) : null,
        cpc: cli > 0 ? (spd / cli).toFixed(4) : null,
        cpm: imp > 0 ? ((spd / imp) * 1000).toFixed(4) : null,
        cpl: leads > 0 ? (spd / leads).toFixed(4) : null,
        connect_rate: cli > 0 ? (lpv / cli).toFixed(4) : null,
      };
    });
  }

  async getExecutionHistory(params: {
    step?: string;
    status?: string;
    limit?: number;
  }) {
    const where: FindOptionsWhere<MetaSyncExecution> = {};
    if (params.step) where.step = params.step as MetaSyncExecutionStep;
    if (params.status)
      where.status = params.status as MetaSyncExecution['status'];

    return this.executionRepo.find({
      where,
      take: params.limit ?? 50,
      order: { started_at: 'DESC' },
    });
  }

  async abortExecution(id: string): Promise<{ aborted: boolean; message: string }> {
    const execution = await this.executionRepo.findOne({ where: { id } });
    if (!execution) {
      return { aborted: false, message: 'Execução não encontrada.' };
    }
    if (execution.status !== 'running') {
      return { aborted: false, message: `Execução já finalizada com status: ${execution.status}` };
    }
    this.abortRequests.add(id);
    execution.status = 'aborted';
    execution.error_message = 'Abortado pelo usuário';
    execution.finished_at = new Date();
    await this.executionRepo.save(execution);
    this.logger.warn(`Execução ${id} marcada para abort pelo usuário`);
    return { aborted: true, message: 'Sinal de abort enviado.' };
  }

  // ─── CSV export ───────────────────────────────────────────────────────────

  async exportPerformanceCsv(params: {
    accountId?: string;
    dateFrom?: string;
    dateTo?: string;
    platform?: string;
    limit?: number;
  }): Promise<string> {
    const { items } = await this.getPerformance({
      ...params,
      limit: params.limit ?? 5000,
    });

    const header = [
      'data',
      'conta_id',
      'campanha_id',
      'campanha_nome',
      'conjunto_id',
      'conjunto_nome',
      'anuncio_id',
      'anuncio_nome',
      'plataforma',
      'impressoes',
      'cliques',
      'cliques_link',
      'alcance',
      'gasto',
      'ctr',
      'cpc',
      'cpm',
      'leads',
      'visualizacoes_pagina',
      'inicios_checkout',
      'compras',
      'connect_rate',
      'video_thruplay',
    ].join(',');

    const rows = items.map((p) =>
      [
        p.report_date,
        p.external_account_id,
        p.external_campaign_id ?? '',
        `"${(p.campaign_name ?? '').replace(/"/g, '""')}"`,
        p.external_adset_id ?? '',
        `"${(p.adset_name ?? '').replace(/"/g, '""')}"`,
        p.external_ad_id,
        `"${(p.ad_name ?? '').replace(/"/g, '""')}"`,
        p.publisher_platform,
        p.impressions,
        p.clicks,
        p.inline_link_clicks ?? '',
        p.reach ?? '',
        p.spend,
        p.ctr ?? '',
        p.cpc ?? '',
        p.cpm ?? '',
        p.leads,
        p.landing_page_views,
        p.initiate_checkouts,
        p.purchases,
        p.connect_rate ?? '',
        p.video_thruplay_watched ?? '',
      ].join(','),
    );

    return [header, ...rows].join('\n');
  }

  async importPerformanceCsv(
    csvContent: string,
  ): Promise<{ imported: number; skipped: number }> {
    const lines = csvContent.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      throw new Error('CSV sem linhas de dados.');
    }

    const headers = this.parseCsvLine(lines[0]).map((h) =>
      h.trim().toLowerCase(),
    );
    const idx = (name: string) => headers.indexOf(name);

    let imported = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = this.parseCsvLine(lines[i]);
      if (cols.length < 2) {
        skipped++;
        continue;
      }

      const get = (col: string) => cols[idx(col)]?.trim() ?? '';

      const accountId = get('conta_id');
      const adId = get('anuncio_id');
      const reportDate = get('data');

      if (!accountId || !adId || !reportDate) {
        skipped++;
        continue;
      }

      const platform = get('plataforma') || 'total';
      const llc = parseInt(get('cliques_link') || '0', 10);
      const lpv = parseInt(get('visualizacoes_pagina') || '0', 10);
      const connectRate =
        llc > 0 ? String(lpv / llc) : get('connect_rate') || null;

      await this.performanceRepo.upsert(
        {
          external_account_id: accountId,
          external_campaign_id: get('campanha_id') || undefined,
          campaign_name: get('campanha_nome') || undefined,
          external_adset_id: get('conjunto_id') || undefined,
          adset_name: get('conjunto_nome') || undefined,
          external_ad_id: adId,
          ad_name: get('anuncio_nome') || undefined,
          report_date: reportDate,
          publisher_platform: platform,
          impressions: get('impressoes') || '0',
          clicks: get('cliques') || '0',
          inline_link_clicks: get('cliques_link') || undefined,
          reach: get('alcance') || undefined,
          spend: get('gasto') || '0',
          ctr: get('ctr') || undefined,
          cpc: get('cpc') || undefined,
          cpm: get('cpm') || undefined,
          leads: get('leads') || '0',
          landing_page_views: get('visualizacoes_pagina') || '0',
          initiate_checkouts: get('inicios_checkout') || '0',
          purchases: get('compras') || '0',
          video_thruplay_watched: get('video_thruplay') || undefined,
          connect_rate: connectRate ?? undefined,
        } as any,
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
      imported++;
    }

    return { imported, skipped };
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async resolveTargets(params: {
    connectionId?: string;
    accountIds?: string[];
  }): Promise<Array<{ connectionId: string; accountIds: string[] }>> {
    if (
      params.accountIds &&
      params.accountIds.length > 0 &&
      params.connectionId
    ) {
      return [
        { connectionId: params.connectionId, accountIds: params.accountIds },
      ];
    }

    const selected = await this.getSelectedMetaAccountIds(params.connectionId);
    if (selected.length === 0) {
      throw new BadRequestException(
        'Nenhuma conta Meta Ads selecionada para sincronização.',
      );
    }

    const grouped = new Map<string, string[]>();
    for (const { connectionId, accountId } of selected) {
      const list = grouped.get(connectionId) ?? [];
      list.push(accountId);
      grouped.set(connectionId, list);
    }

    return Array.from(grouped.entries()).map(([connectionId, accountIds]) => ({
      connectionId,
      accountIds,
    }));
  }
}
