import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { OAuthConnection } from '../database/entities/integrations/oauth-connection.entity';
import { MarketingAdDailyPerformance } from '../database/entities/marketing-sync/marketing-ad-daily-performance.entity';
import { MarketingConnectionAccount } from '../database/entities/marketing-sync/marketing-connection-account.entity';
import { MarketingExtractJob } from '../database/entities/marketing-sync/marketing-extract-job.entity';
import { MarketingExtractRaw } from '../database/entities/marketing-sync/marketing-extract-raw.entity';
import { MarketingCampaignDailyPerformance } from '../database/entities/marketing-sync/marketing-campaign-daily-performance.entity';
import { MarketingSyncConfiguration } from '../database/entities/marketing-sync/marketing-sync-configuration.entity';
import { GoogleAdsOAuthService } from '../oauth/google-ads-oauth.service';
import { MetaAdsOAuthService } from '../oauth/meta-ads-oauth.service';
import { ServiceBusService } from '../service-bus/service-bus.service';
import { MarketingExtractProcessorService } from './marketing-extract-processor.service';
import { MarketingSyncConfigurationsQueryDto } from './dto/marketing-sync-configurations-query.dto';
import { UpsertMarketingSyncConfigurationDto } from './dto/upsert-marketing-sync-configuration.dto';

export type MarketingExtractQueueMessage = {
  jobId: string;
  requestId: string;
  enqueuedAt: string;
  source?: string;
};

type RefreshAccountsResult = {
  provider: string;
  connectionId: string;
  refreshedAccounts: number;
};

type MarketingExtractScheduleConfiguration = {
  source: 'database' | 'env';
  enabled: boolean;
  scheduleEnabled: boolean;
  intervalMinutes: number;
  provider?: string;
  syncKey: string;
};

type AdPerformanceCsvRow = {
  provider: string;
  external_account_id: string;
  account_name?: string;
  external_campaign_id?: string;
  campaign_name?: string;
  external_adset_id?: string;
  adset_name?: string;
  external_ad_id: string;
  ad_name?: string;
  report_date: string;
  impressions: string;
  clicks: string;
  spend: string;
  conversions?: string;
  metadata_json?: string;
};

@Injectable()
export class MarketingSyncService {
  private readonly logger = new Logger(MarketingSyncService.name);

  constructor(
    @InjectRepository(OAuthConnection)
    private readonly oauthConnectionRepository: Repository<OAuthConnection>,
    @InjectRepository(MarketingConnectionAccount)
    private readonly accountRepository: Repository<MarketingConnectionAccount>,
    @InjectRepository(MarketingExtractJob)
    private readonly jobRepository: Repository<MarketingExtractJob>,
    @InjectRepository(MarketingExtractRaw)
    private readonly rawRepository: Repository<MarketingExtractRaw>,
    @InjectRepository(MarketingAdDailyPerformance)
    private readonly adPerformanceRepository: Repository<MarketingAdDailyPerformance>,
    @InjectRepository(MarketingCampaignDailyPerformance)
    private readonly performanceRepository: Repository<MarketingCampaignDailyPerformance>,
    @InjectRepository(MarketingSyncConfiguration)
    private readonly configurationRepository: Repository<MarketingSyncConfiguration>,
    private readonly googleAdsOAuthService: GoogleAdsOAuthService,
    private readonly metaAdsOAuthService: MetaAdsOAuthService,
    private readonly serviceBus: ServiceBusService,
    private readonly config: ConfigService,
    private readonly marketingExtractProcessor: MarketingExtractProcessorService,
  ) {}

  async refreshAccountsForConnection(
    connectionId: string,
  ): Promise<RefreshAccountsResult> {
    const connection = await this.oauthConnectionRepository.findOne({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException('Conexao OAuth nao encontrada.');
    }

    const providerAccounts = await this.fetchProviderAccounts(connection);
    const existingAccounts = await this.accountRepository.find({
      where: { oauth_connection: { id: connection.id } },
      relations: { oauth_connection: true },
    });
    const existingMap = new Map(
      existingAccounts.map((account) => [account.external_account_id, account]),
    );
    const seenIds = new Set<string>();
    const now = new Date();

    for (const providerAccount of providerAccounts) {
      seenIds.add(providerAccount.externalAccountId);

      const existing = existingMap.get(providerAccount.externalAccountId);
      const account =
        existing ??
        this.accountRepository.create({
          oauth_connection: connection,
          provider: connection.provider,
          external_account_id: providerAccount.externalAccountId,
        });

      account.external_account_name = providerAccount.externalAccountName;
      account.parent_external_account_id =
        providerAccount.parentExternalAccountId ?? undefined;
      account.is_manager = providerAccount.isManager;
      account.status =
        providerAccount.accessible === false ? 'restricted' : 'active';
      account.last_seen_at = now;
      account.metadata = providerAccount.metadata;

      await this.accountRepository.save(account);
    }

    for (const existing of existingAccounts) {
      if (seenIds.has(existing.external_account_id)) {
        continue;
      }

      await this.accountRepository.remove(existing);
    }

    return {
      provider: connection.provider,
      connectionId: connection.id,
      refreshedAccounts: providerAccounts.length,
    };
  }

  async refreshAccountsForProvider(provider?: string) {
    const where = provider
      ? { provider, status: 'active' }
      : { status: 'active' };
    const connections = await this.oauthConnectionRepository.find({ where });

    const results: RefreshAccountsResult[] = [];
    for (const connection of connections) {
      results.push(await this.refreshAccountsForConnection(connection.id));
    }

    return {
      provider: provider ?? 'all',
      refreshedConnections: results.length,
      results,
    };
  }

  async listConfigurations(params?: MarketingSyncConfigurationsQueryDto) {
    const queryBuilder = this.configurationRepository
      .createQueryBuilder('configuration')
      .orderBy('configuration.sync_key', 'ASC')
      .addOrderBy('configuration.provider', 'ASC', 'NULLS FIRST');

    if (params?.syncKey) {
      queryBuilder.andWhere('configuration.sync_key = :syncKey', {
        syncKey: params.syncKey,
      });
    }

    if (params?.provider) {
      queryBuilder.andWhere('configuration.provider = :provider', {
        provider: params.provider,
      });
    }

    const configurations = await queryBuilder.getMany();
    return configurations.map((configuration) =>
      this.serializeConfiguration(configuration),
    );
  }

  async upsertConfiguration(body: UpsertMarketingSyncConfigurationDto) {
    const syncKey = body.syncKey?.trim();
    const provider = body.provider?.trim() || null;

    if (!syncKey) {
      throw new BadRequestException('syncKey e obrigatorio.');
    }

    if (
      body.scheduleIntervalMinutes != null &&
      (!Number.isInteger(body.scheduleIntervalMinutes) ||
        body.scheduleIntervalMinutes <= 0)
    ) {
      throw new BadRequestException(
        'scheduleIntervalMinutes deve ser um inteiro > 0 quando informado.',
      );
    }

    const existingQuery = this.configurationRepository
      .createQueryBuilder('configuration')
      .where('configuration.sync_key = :syncKey', { syncKey });

    if (provider == null) {
      existingQuery.andWhere('configuration.provider IS NULL');
    } else {
      existingQuery.andWhere('configuration.provider = :provider', {
        provider,
      });
    }

    const existing = await existingQuery.getOne();

    const configuration =
      existing ??
      this.configurationRepository.create({
        sync_key: syncKey,
        provider,
        enabled: true,
        schedule_enabled: false,
      });

    if (body.enabled !== undefined) {
      configuration.enabled = Boolean(body.enabled);
    }

    if (body.scheduleEnabled !== undefined) {
      configuration.schedule_enabled = Boolean(body.scheduleEnabled);
    }

    if (body.scheduleIntervalMinutes !== undefined) {
      configuration.schedule_interval_minutes = body.scheduleIntervalMinutes;
    }

    if (body.config !== undefined) {
      configuration.config = body.config;
    }

    if (body.metadata !== undefined) {
      configuration.metadata = body.metadata;
    }

    const saved = await this.configurationRepository.save(configuration);
    return this.serializeConfiguration(saved);
  }

  async getEffectiveMarketingExtractScheduleConfiguration(): Promise<MarketingExtractScheduleConfiguration> {
    const configuration = await this.configurationRepository
      .createQueryBuilder('configuration')
      .where('configuration.sync_key = :syncKey', {
        syncKey: 'marketing_extract',
      })
      .andWhere('configuration.provider IS NULL')
      .getOne();

    if (configuration) {
      const config = this.asObject(configuration.config);
      const configuredProvider =
        typeof config.provider === 'string' && config.provider.trim().length > 0
          ? config.provider.trim()
          : undefined;

      return {
        source: 'database',
        enabled: configuration.enabled,
        scheduleEnabled: configuration.schedule_enabled,
        intervalMinutes: this.normalizeScheduleInterval(
          configuration.schedule_interval_minutes,
        ),
        provider: configuredProvider,
        syncKey: configuration.sync_key,
      };
    }

    return {
      source: 'env',
      enabled:
        this.config.get<string>(
          'MARKETING_DASHBOARD_SCHEDULER_ENABLED',
          'false',
        ) === 'true',
      scheduleEnabled:
        this.config.get<string>(
          'MARKETING_DASHBOARD_SCHEDULER_ENABLED',
          'false',
        ) === 'true',
      intervalMinutes: this.normalizeScheduleInterval(
        Number(
          this.config.get<string>(
            'MARKETING_DASHBOARD_SCHEDULER_INTERVAL_MINUTES',
            '60',
          ),
        ),
      ),
      syncKey: 'marketing_extract',
    };
  }

  async listAccounts(params?: {
    provider?: string;
    connectionId?: string;
    selected?: string;
  }) {
    const queryBuilder = this.accountRepository
      .createQueryBuilder('account')
      .leftJoinAndSelect('account.oauth_connection', 'oauth_connection')
      .orderBy('account.updated_at', 'DESC');

    if (params?.provider) {
      queryBuilder.andWhere('account.provider = :provider', {
        provider: params.provider,
      });
    }

    if (params?.connectionId) {
      queryBuilder.andWhere('oauth_connection.id = :connectionId', {
        connectionId: params.connectionId,
      });
    }

    if (params?.selected === 'true' || params?.selected === 'false') {
      queryBuilder.andWhere('account.selected = :selected', {
        selected: params.selected === 'true',
      });
    }

    const accounts = await queryBuilder.getMany();
    return accounts.map((account) => ({
      id: account.id,
      provider: account.provider,
      connectionId: account.oauth_connection.id,
      externalAccountId: account.external_account_id,
      externalAccountName: account.external_account_name ?? null,
      parentExternalAccountId: account.parent_external_account_id ?? null,
      isManager: account.is_manager,
      status: account.status,
      selected: account.selected,
      lastSeenAt: account.last_seen_at?.toISOString() ?? null,
      metadata: account.metadata ?? null,
      createdAt: account.created_at.toISOString(),
      updatedAt: account.updated_at.toISOString(),
    }));
  }

  async setAccountSelection(accountId: string, selected: boolean) {
    const account = await this.accountRepository.findOne({
      where: { id: accountId },
      relations: { oauth_connection: true },
    });

    if (!account) {
      throw new NotFoundException('Conta sincronizada nao encontrada.');
    }

    if (selected && account.status === 'restricted') {
      throw new BadRequestException(
        'Conta com status restricted nao pode ser marcada para extracao.',
      );
    }

    account.selected = selected;
    await this.accountRepository.save(account);

    return {
      id: account.id,
      selected: account.selected,
      provider: account.provider,
      connectionId: account.oauth_connection.id,
      externalAccountId: account.external_account_id,
    };
  }

  async createDailyJobs(params?: {
    provider?: string;
    includeToday?: boolean;
    enqueue?: boolean;
  }) {
    const selectedAccounts = await this.accountRepository.find({
      where: {
        selected: true,
        status: 'active',
        ...(params?.provider ? { provider: params.provider } : {}),
      },
      relations: { oauth_connection: true },
    });

    const yesterday = this.formatDate(this.shiftDate(-1));
    const today = this.formatDate(new Date());
    const targetDates = params?.includeToday ? [yesterday, today] : [yesterday];

    const jobs: Array<Record<string, unknown>> = [];

    for (const account of selectedAccounts) {
      for (const targetDate of targetDates) {
        const existing = await this.jobRepository.findOne({
          where: {
            oauth_connection: { id: account.oauth_connection.id },
            provider: account.provider,
            external_account_id: account.external_account_id,
            date_from: targetDate,
            date_to: targetDate,
          },
          relations: { oauth_connection: true },
        });

        const job =
          existing ??
          this.jobRepository.create({
            oauth_connection: account.oauth_connection,
            provider: account.provider,
            external_account_id: account.external_account_id,
            date_from: targetDate,
            date_to: targetDate,
            preset: targetDate === today ? 'today' : 'yesterday',
            status: 'pending',
            requested_at: new Date(),
            metadata: {
              accountName: account.external_account_name ?? null,
            },
          });

        if (!existing) {
          await this.jobRepository.save(job);
        } else if (existing.status === 'failed') {
          existing.status = 'pending';
          existing.error_message = undefined;
          existing.requested_at = new Date();
          await this.jobRepository.save(existing);
        }

        const finalJob = existing ?? job;
        if (params?.enqueue !== false) {
          await this.enqueueJob(finalJob.id, 'daily:start');
        }

        jobs.push({
          id: finalJob.id,
          provider: finalJob.provider,
          externalAccountId: finalJob.external_account_id,
          dateFrom: finalJob.date_from,
          dateTo: finalJob.date_to,
          status: finalJob.status,
        });
      }
    }

    return {
      createdJobs: jobs.length,
      jobs,
    };
  }

  async createManualJobs(params: {
    provider?: string;
    accountId?: string;
    dateFrom: string;
    dateTo: string;
    enqueue?: boolean;
  }) {
    const dateFrom = params.dateFrom?.trim();
    const dateTo = params.dateTo?.trim();

    if (!dateFrom || !dateTo) {
      throw new BadRequestException('dateFrom e dateTo sao obrigatorios.');
    }

    if (!this.isIsoDate(dateFrom) || !this.isIsoDate(dateTo)) {
      throw new BadRequestException(
        'dateFrom e dateTo devem estar no formato YYYY-MM-DD.',
      );
    }

    if (dateFrom > dateTo) {
      throw new BadRequestException('dateFrom nao pode ser maior que dateTo.');
    }

    let accounts: MarketingConnectionAccount[] = [];

    if (params.accountId?.trim()) {
      const account = await this.accountRepository.findOne({
        where: { id: params.accountId.trim() },
        relations: { oauth_connection: true },
      });

      if (!account) {
        throw new NotFoundException('Conta sincronizada nao encontrada.');
      }

      if (account.status !== 'active') {
        throw new BadRequestException(
          'A conta informada nao esta ativa para extracao manual.',
        );
      }

      if (params.provider && account.provider !== params.provider) {
        throw new BadRequestException(
          'A conta informada nao pertence ao provider solicitado.',
        );
      }

      accounts = [account];
    } else {
      accounts = await this.accountRepository.find({
        where: {
          status: 'active',
          selected: true,
          ...(params.provider ? { provider: params.provider } : {}),
        },
        relations: { oauth_connection: true },
      });
    }

    const jobs: Array<Record<string, unknown>> = [];

    for (const account of accounts) {
      const existing = await this.jobRepository.findOne({
        where: {
          oauth_connection: { id: account.oauth_connection.id },
          provider: account.provider,
          external_account_id: account.external_account_id,
          date_from: dateFrom,
          date_to: dateTo,
        },
        relations: { oauth_connection: true },
      });

      let finalJob = existing;

      if (!existing) {
        finalJob = await this.jobRepository.save(
          this.jobRepository.create({
            oauth_connection: account.oauth_connection,
            provider: account.provider,
            external_account_id: account.external_account_id,
            date_from: dateFrom,
            date_to: dateTo,
            preset: 'manual',
            status: 'pending',
            requested_at: new Date(),
            metadata: {
              accountName: account.external_account_name ?? null,
              source: 'manual',
            },
          }),
        );
      } else if (
        existing.status === 'failed' ||
        existing.status === 'completed'
      ) {
        existing.status = 'pending';
        existing.started_at = undefined;
        existing.completed_at = undefined;
        existing.error_message = undefined;
        existing.requested_at = new Date();
        existing.preset = 'manual';
        existing.metadata = {
          ...(existing.metadata ?? {}),
          accountName: account.external_account_name ?? null,
          source: 'manual',
        };
        finalJob = await this.jobRepository.save(existing);
      }

      if (!finalJob) {
        continue;
      }

      if (params.enqueue !== false) {
        await this.enqueueJob(finalJob.id, 'manual:range');
      }

      jobs.push({
        id: finalJob.id,
        provider: finalJob.provider,
        externalAccountId: finalJob.external_account_id,
        dateFrom: finalJob.date_from,
        dateTo: finalJob.date_to,
        status: finalJob.status,
      });
    }

    return {
      createdJobs: jobs.length,
      jobs,
      dateFrom,
      dateTo,
    };
  }

  async scheduleHourlyTodayJobs(params?: { provider?: string }) {
    const selectedAccounts = await this.accountRepository.find({
      where: {
        selected: true,
        status: 'active',
        ...(params?.provider ? { provider: params.provider } : {}),
      },
      relations: { oauth_connection: true },
    });

    const today = this.formatDate(new Date());
    const jobs: Array<Record<string, unknown>> = [];
    let enqueuedJobs = 0;
    let skippedJobs = 0;

    for (const account of selectedAccounts) {
      const existing = await this.jobRepository.findOne({
        where: {
          oauth_connection: { id: account.oauth_connection.id },
          provider: account.provider,
          external_account_id: account.external_account_id,
          date_from: today,
          date_to: today,
        },
        relations: { oauth_connection: true },
      });

      let finalJob = existing;

      if (!existing) {
        finalJob = await this.jobRepository.save(
          this.jobRepository.create({
            oauth_connection: account.oauth_connection,
            provider: account.provider,
            external_account_id: account.external_account_id,
            date_from: today,
            date_to: today,
            preset: 'today',
            status: 'pending',
            requested_at: new Date(),
            metadata: {
              accountName: account.external_account_name ?? null,
              scheduler: 'hourly',
            },
          }),
        );

        await this.enqueueJob(finalJob.id, 'scheduler:hourly');
        enqueuedJobs += 1;
      } else if (
        existing.status === 'failed' ||
        existing.status === 'completed'
      ) {
        existing.status = 'pending';
        existing.started_at = undefined;
        existing.completed_at = undefined;
        existing.error_message = undefined;
        existing.requested_at = new Date();
        existing.metadata = {
          ...(existing.metadata ?? {}),
          scheduler: 'hourly',
        };
        finalJob = await this.jobRepository.save(existing);
        await this.enqueueJob(finalJob.id, 'scheduler:hourly');
        enqueuedJobs += 1;
      } else {
        skippedJobs += 1;
      }

      if (!finalJob) {
        skippedJobs += 1;
        continue;
      }

      jobs.push({
        id: finalJob.id,
        provider: finalJob.provider,
        externalAccountId: finalJob.external_account_id,
        dateFrom: finalJob.date_from,
        dateTo: finalJob.date_to,
        status: finalJob.status,
      });
    }

    return {
      targetDate: today,
      selectedAccounts: selectedAccounts.length,
      enqueuedJobs,
      skippedJobs,
      jobs,
    };
  }

  async listJobs(params?: {
    provider?: string;
    status?: string;
    accountId?: string;
  }) {
    const queryBuilder = this.jobRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.oauth_connection', 'oauth_connection')
      .orderBy('job.requested_at', 'DESC');

    if (params?.provider) {
      queryBuilder.andWhere('job.provider = :provider', {
        provider: params.provider,
      });
    }

    if (params?.status) {
      queryBuilder.andWhere('job.status = :status', {
        status: params.status,
      });
    }

    if (params?.accountId) {
      queryBuilder.andWhere('job.external_account_id = :accountId', {
        accountId: params.accountId,
      });
    }

    const jobs = await queryBuilder.getMany();
    return jobs.map((job) => ({
      id: job.id,
      provider: job.provider,
      connectionId: job.oauth_connection.id,
      externalAccountId: job.external_account_id,
      dateFrom: job.date_from,
      dateTo: job.date_to,
      preset: job.preset ?? null,
      status: job.status,
      requestedAt: job.requested_at.toISOString(),
      startedAt: job.started_at?.toISOString() ?? null,
      completedAt: job.completed_at?.toISOString() ?? null,
      errorMessage: job.error_message ?? null,
      metadata: job.metadata ?? null,
      createdAt: job.created_at.toISOString(),
      updatedAt: job.updated_at.toISOString(),
    }));
  }

  async listRaw(params?: {
    provider?: string;
    accountId?: string;
    jobId?: string;
    reportDate?: string;
    limit?: string;
  }) {
    const queryBuilder = this.rawRepository
      .createQueryBuilder('raw')
      .leftJoinAndSelect('raw.job', 'job')
      .orderBy('raw.created_at', 'DESC');

    if (params?.provider) {
      queryBuilder.andWhere('raw.provider = :provider', {
        provider: params.provider,
      });
    }

    if (params?.accountId) {
      queryBuilder.andWhere('raw.external_account_id = :accountId', {
        accountId: params.accountId,
      });
    }

    if (params?.jobId) {
      queryBuilder.andWhere('job.id = :jobId', {
        jobId: params.jobId,
      });
    }

    if (params?.reportDate) {
      queryBuilder.andWhere('raw.report_date = :reportDate', {
        reportDate: params.reportDate,
      });
    }

    queryBuilder.limit(Number(params?.limit ?? '20'));

    const rows = await queryBuilder.getMany();
    return rows.map((row) => ({
      id: row.id,
      jobId: row.job.id,
      provider: row.provider,
      externalAccountId: row.external_account_id,
      reportDate: row.report_date,
      payload: row.payload,
      createdAt: row.created_at.toISOString(),
    }));
  }

  async listPerformance(params?: {
    provider?: string;
    accountId?: string;
    reportDate?: string;
    limit?: string;
  }) {
    const queryBuilder = this.performanceRepository
      .createQueryBuilder('performance')
      .orderBy('performance.report_date', 'DESC')
      .addOrderBy('performance.updated_at', 'DESC');

    if (params?.provider) {
      queryBuilder.andWhere('performance.provider = :provider', {
        provider: params.provider,
      });
    }

    if (params?.accountId) {
      queryBuilder.andWhere('performance.external_account_id = :accountId', {
        accountId: params.accountId,
      });
    }

    if (params?.reportDate) {
      queryBuilder.andWhere('performance.report_date = :reportDate', {
        reportDate: params.reportDate,
      });
    }

    queryBuilder.limit(Number(params?.limit ?? '50'));

    const rows = await queryBuilder.getMany();
    return rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      externalAccountId: row.external_account_id,
      externalCampaignId: row.external_campaign_id,
      campaignName: row.campaign_name ?? null,
      reportDate: row.report_date,
      impressions: row.impressions,
      clicks: row.clicks,
      spend: row.spend,
      conversions: row.conversions ?? null,
      metadata: row.metadata ?? null,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    }));
  }

  async exportAdPerformanceCsv(params?: {
    provider?: string;
    accountId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: string;
  }): Promise<string> {
    const queryBuilder = this.adPerformanceRepository
      .createQueryBuilder('performance')
      .orderBy('performance.report_date', 'DESC')
      .addOrderBy('performance.updated_at', 'DESC');

    if (params?.provider) {
      queryBuilder.andWhere('performance.provider = :provider', {
        provider: params.provider,
      });
    }

    if (params?.accountId) {
      queryBuilder.andWhere('performance.external_account_id = :accountId', {
        accountId: params.accountId,
      });
    }

    if (params?.dateFrom) {
      queryBuilder.andWhere('performance.report_date >= :dateFrom', {
        dateFrom: params.dateFrom,
      });
    }

    if (params?.dateTo) {
      queryBuilder.andWhere('performance.report_date <= :dateTo', {
        dateTo: params.dateTo,
      });
    }

    queryBuilder.limit(Number(params?.limit ?? '5000'));

    const rows = await queryBuilder.getMany();
    const headers = [
      'provider',
      'external_account_id',
      'account_name',
      'external_campaign_id',
      'campaign_name',
      'external_adset_id',
      'adset_name',
      'external_ad_id',
      'ad_name',
      'report_date',
      'impressions',
      'clicks',
      'spend',
      'conversions',
      'metadata_json',
    ];

    const csv = [
      headers,
      ...rows.map((row) => [
        row.provider,
        row.external_account_id,
        row.account_name ?? '',
        row.external_campaign_id ?? '',
        row.campaign_name ?? '',
        row.external_adset_id ?? '',
        row.adset_name ?? '',
        row.external_ad_id,
        row.ad_name ?? '',
        row.report_date,
        row.impressions,
        row.clicks,
        row.spend,
        row.conversions ?? '',
        row.metadata ? JSON.stringify(row.metadata) : '',
      ]),
    ]
      .map((row) =>
        row.map((value) => this.escapeCsv(String(value ?? ''))).join(','),
      )
      .join('\r\n');

    return `\uFEFF${csv}`;
  }

  async importAdPerformanceCsv(params: {
    csvContent: string;
    providerOverride?: string;
  }) {
    const rows = this.parseCsv(params.csvContent);
    if (!rows.length) {
      throw new BadRequestException('CSV vazio.');
    }

    const [headerRow, ...dataRows] = rows;
    const headers = headerRow.map((value) => value.trim());
    const requiredHeaders = [
      'provider',
      'external_account_id',
      'external_ad_id',
      'report_date',
      'impressions',
      'clicks',
      'spend',
    ];

    for (const header of requiredHeaders) {
      if (!headers.includes(header)) {
        throw new BadRequestException(
          `CSV invalido. Coluna obrigatoria ausente: ${header}.`,
        );
      }
    }

    const parsedRows: AdPerformanceCsvRow[] = dataRows
      .filter((row) => row.some((value) => value.trim().length > 0))
      .map((row, index) =>
        this.mapCsvRow(headers, row, index + 2, params.providerOverride),
      );

    if (!parsedRows.length) {
      throw new BadRequestException('CSV sem linhas de dados.');
    }

    const affectedKeys = new Set<string>();
    let inserted = 0;
    let updated = 0;

    for (const row of parsedRows) {
      const existing = await this.adPerformanceRepository.findOne({
        where: {
          provider: row.provider,
          external_account_id: row.external_account_id,
          external_ad_id: row.external_ad_id,
          report_date: row.report_date,
        },
      });

      const entity =
        existing ??
        this.adPerformanceRepository.create({
          provider: row.provider,
          external_account_id: row.external_account_id,
          external_ad_id: row.external_ad_id,
          report_date: row.report_date,
        });

      entity.account_name = row.account_name?.trim() || undefined;
      entity.external_campaign_id =
        row.external_campaign_id?.trim() || undefined;
      entity.campaign_name = row.campaign_name?.trim() || undefined;
      entity.external_adset_id = row.external_adset_id?.trim() || undefined;
      entity.adset_name = row.adset_name?.trim() || undefined;
      entity.ad_name = row.ad_name?.trim() || undefined;
      entity.impressions = row.impressions;
      entity.clicks = row.clicks;
      entity.spend = row.spend;
      entity.conversions = row.conversions?.trim()
        ? row.conversions
        : undefined;
      entity.metadata = row.metadata_json?.trim()
        ? this.safeParseJson(row.metadata_json)
        : undefined;

      await this.adPerformanceRepository.save(entity);

      if (existing) {
        updated += 1;
      } else {
        inserted += 1;
      }

      affectedKeys.add(
        `${row.provider}|${row.external_account_id}|${row.report_date}`,
      );
    }

    await this.rebuildCampaignPerformanceFromAdRows(affectedKeys);

    return {
      importedRows: parsedRows.length,
      inserted,
      updated,
      affectedGroups: affectedKeys.size,
    };
  }

  async enqueueJob(jobId: string, source?: string) {
    if (!this.serviceBus.isEnabled()) {
      this.logger.warn(
        `Service Bus desabilitado. Processando job imediatamente em modo local (jobId=${jobId}).`,
      );
      const processed = await this.marketingExtractProcessor.processJob(jobId);
      return {
        queued: false,
        processedInline: true,
        jobId,
        result: processed,
      };
    }

    const queueName = this.config.get<string>(
      'SERVICE_BUS_MARKETING_EXTRACT_QUEUE',
      'marketing-extract',
    );

    const message: MarketingExtractQueueMessage = {
      jobId,
      requestId: randomUUID(),
      enqueuedAt: new Date().toISOString(),
      source,
    };

    await this.serviceBus.publish(queueName, message, {
      subject: 'marketing.extract',
    });

    this.logger.log(
      `Job de marketing enfileirado em "${queueName}" (jobId=${jobId}, requestId=${message.requestId}).`,
    );

    return {
      queued: true,
      queueName,
      jobId,
      requestId: message.requestId,
    };
  }

  private async fetchProviderAccounts(connection: OAuthConnection) {
    if (connection.provider === 'google_ads') {
      const payload = await this.googleAdsOAuthService.listAvailableAccounts(
        connection.id,
      );

      return payload.accounts.map((account) => ({
        externalAccountId: String(account.customerId),
        externalAccountName: account.descriptiveName ?? account.customerId,
        parentExternalAccountId:
          this.googleAdsOAuthService.getConfiguredLoginCustomerId(),
        isManager: Boolean(account.manager),
        accessible: account.accessible !== false,
        metadata: account as Record<string, unknown>,
      }));
    }

    if (connection.provider === 'meta_ads') {
      const payload = await this.metaAdsOAuthService.listAvailableAccounts(
        connection.id,
      );

      return payload.accounts.map((account) => ({
        externalAccountId: String(account.accountId),
        externalAccountName: account.name || account.accountId,
        parentExternalAccountId: account.businessId ?? null,
        isManager: false,
        accessible: account.accessible !== false,
        metadata: account as Record<string, unknown>,
      }));
    }

    return [];
  }

  private shiftDate(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private isIsoDate(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  private escapeCsv(value: string): string {
    if (/[",\r\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }

    return value;
  }

  private parseCsv(content: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentValue = '';
    let inQuotes = false;
    const normalized = content.replace(/^\uFEFF/, '');

    for (let index = 0; index < normalized.length; index += 1) {
      const char = normalized[index];
      const next = normalized[index + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          currentValue += '"';
          index += 1;
          continue;
        }

        inQuotes = !inQuotes;
        continue;
      }

      if (char === ',' && !inQuotes) {
        currentRow.push(currentValue);
        currentValue = '';
        continue;
      }

      if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && next === '\n') {
          index += 1;
        }

        currentRow.push(currentValue);
        rows.push(currentRow);
        currentRow = [];
        currentValue = '';
        continue;
      }

      currentValue += char;
    }

    if (currentValue.length > 0 || currentRow.length > 0) {
      currentRow.push(currentValue);
      rows.push(currentRow);
    }

    return rows;
  }

  private mapCsvRow(
    headers: string[],
    row: string[],
    lineNumber: number,
    providerOverride?: string,
  ): AdPerformanceCsvRow {
    const get = (header: string) => row[headers.indexOf(header)] ?? '';
    const provider = (providerOverride ?? get('provider')).trim();
    const externalAccountId = get('external_account_id').trim();
    const externalAdId = get('external_ad_id').trim();
    const reportDate = get('report_date').trim();

    if (!provider || !externalAccountId || !externalAdId || !reportDate) {
      throw new BadRequestException(
        `CSV invalido na linha ${lineNumber}. provider, external_account_id, external_ad_id e report_date sao obrigatorios.`,
      );
    }

    if (!this.isIsoDate(reportDate)) {
      throw new BadRequestException(
        `CSV invalido na linha ${lineNumber}. report_date deve estar no formato YYYY-MM-DD.`,
      );
    }

    return {
      provider,
      external_account_id: externalAccountId,
      account_name: get('account_name').trim() || undefined,
      external_campaign_id: get('external_campaign_id').trim() || undefined,
      campaign_name: get('campaign_name').trim() || undefined,
      external_adset_id: get('external_adset_id').trim() || undefined,
      adset_name: get('adset_name').trim() || undefined,
      external_ad_id: externalAdId,
      ad_name: get('ad_name').trim() || undefined,
      report_date: reportDate,
      impressions: this.normalizeIntegerString(
        get('impressions'),
        lineNumber,
        'impressions',
      ),
      clicks: this.normalizeIntegerString(get('clicks'), lineNumber, 'clicks'),
      spend: this.normalizeDecimalString(get('spend'), lineNumber, 'spend'),
      conversions: get('conversions').trim()
        ? this.normalizeDecimalString(
            get('conversions'),
            lineNumber,
            'conversions',
          )
        : undefined,
      metadata_json: get('metadata_json').trim() || undefined,
    };
  }

  private normalizeIntegerString(
    value: string,
    lineNumber: number,
    field: string,
  ): string {
    const normalized = value.trim();
    if (!/^\d+$/.test(normalized)) {
      throw new BadRequestException(
        `CSV invalido na linha ${lineNumber}. ${field} deve ser inteiro >= 0.`,
      );
    }

    return normalized;
  }

  private normalizeDecimalString(
    value: string,
    lineNumber: number,
    field: string,
  ): string {
    const normalized = value.trim();
    if (!/^\d+(\.\d+)?$/.test(normalized)) {
      throw new BadRequestException(
        `CSV invalido na linha ${lineNumber}. ${field} deve ser numero decimal >= 0.`,
      );
    }

    return normalized;
  }

  private safeParseJson(value: string): Record<string, unknown> | undefined {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      return parsed && typeof parsed === 'object' ? parsed : undefined;
    } catch {
      throw new BadRequestException('metadata_json invalido no CSV.');
    }
  }

  private async rebuildCampaignPerformanceFromAdRows(
    affectedKeys: Set<string>,
  ) {
    for (const key of affectedKeys) {
      const [provider, externalAccountId, reportDate] = key.split('|');

      await this.performanceRepository
        .createQueryBuilder()
        .delete()
        .from(MarketingCampaignDailyPerformance)
        .where('provider = :provider', { provider })
        .andWhere('external_account_id = :externalAccountId', {
          externalAccountId,
        })
        .andWhere('report_date = :reportDate', { reportDate })
        .execute();

      const rows = await this.adPerformanceRepository
        .createQueryBuilder('ad')
        .select('ad.external_campaign_id', 'external_campaign_id')
        .addSelect('MAX(ad.campaign_name)', 'campaign_name')
        .addSelect('COALESCE(SUM(ad.impressions), 0)', 'impressions')
        .addSelect('COALESCE(SUM(ad.clicks), 0)', 'clicks')
        .addSelect('COALESCE(SUM(ad.spend), 0)', 'spend')
        .addSelect('COALESCE(SUM(ad.conversions), 0)', 'conversions')
        .where('ad.provider = :provider', { provider })
        .andWhere('ad.external_account_id = :externalAccountId', {
          externalAccountId,
        })
        .andWhere('ad.report_date = :reportDate', { reportDate })
        .andWhere('ad.external_campaign_id IS NOT NULL')
        .groupBy('ad.external_campaign_id')
        .getRawMany<{
          external_campaign_id: string;
          campaign_name: string | null;
          impressions: string;
          clicks: string;
          spend: string;
          conversions: string;
        }>();

      for (const row of rows) {
        await this.performanceRepository.save(
          this.performanceRepository.create({
            provider,
            external_account_id: externalAccountId,
            external_campaign_id: row.external_campaign_id,
            campaign_name: row.campaign_name ?? undefined,
            report_date: reportDate,
            impressions: row.impressions,
            clicks: row.clicks,
            spend: row.spend,
            conversions:
              row.conversions && row.conversions !== '0'
                ? row.conversions
                : undefined,
            metadata: {
              source: 'csv_import',
            },
          }),
        );
      }
    }
  }

  private normalizeScheduleInterval(value?: number | null): number {
    if (!Number.isFinite(value) || !value || value <= 0) {
      return 60;
    }

    return Math.floor(value);
  }

  private asObject(
    value?: Record<string, unknown> | null,
  ): Record<string, unknown> {
    return value && typeof value === 'object' ? value : {};
  }

  private serializeConfiguration(configuration: MarketingSyncConfiguration) {
    return {
      id: configuration.id,
      syncKey: configuration.sync_key,
      provider: configuration.provider ?? null,
      enabled: configuration.enabled,
      scheduleEnabled: configuration.schedule_enabled,
      scheduleIntervalMinutes: configuration.schedule_interval_minutes ?? null,
      config: configuration.config ?? null,
      metadata: configuration.metadata ?? null,
      createdAt: configuration.created_at.toISOString(),
      updatedAt: configuration.updated_at.toISOString(),
    };
  }
}
