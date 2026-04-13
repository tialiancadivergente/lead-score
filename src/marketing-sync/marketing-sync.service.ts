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
import { MarketingConnectionAccount } from '../database/entities/marketing-sync/marketing-connection-account.entity';
import { MarketingExtractJob } from '../database/entities/marketing-sync/marketing-extract-job.entity';
import { MarketingExtractRaw } from '../database/entities/marketing-sync/marketing-extract-raw.entity';
import { MarketingCampaignDailyPerformance } from '../database/entities/marketing-sync/marketing-campaign-daily-performance.entity';
import { GoogleAdsOAuthService } from '../oauth/google-ads-oauth.service';
import { MetaAdsOAuthService } from '../oauth/meta-ads-oauth.service';
import { ServiceBusService } from '../service-bus/service-bus.service';
import { MarketingExtractProcessorService } from './marketing-extract-processor.service';

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
    @InjectRepository(MarketingCampaignDailyPerformance)
    private readonly performanceRepository: Repository<MarketingCampaignDailyPerformance>,
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

      existing.status = 'missing';
      existing.last_seen_at = now;
      await this.accountRepository.save(existing);
    }

    return {
      provider: connection.provider,
      connectionId: connection.id,
      refreshedAccounts: providerAccounts.length,
    };
  }

  async refreshAccountsForProvider(provider?: string) {
    const where = provider ? { provider, status: 'active' } : { status: 'active' };
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
        parentExternalAccountId: this.googleAdsOAuthService.getConfiguredLoginCustomerId(),
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
        externalAccountName: account.name ?? account.accountId,
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
}
