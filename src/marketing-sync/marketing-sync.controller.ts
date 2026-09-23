import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  Ip,
  Headers,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiBadRequestResponse,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AuditLogService } from '../audit/audit-log.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { MarketingExtractProcessorService } from './marketing-extract-processor.service';
import { MarketingSyncConfigurationsQueryDto } from './dto/marketing-sync-configurations-query.dto';
import { UpsertMarketingSyncConfigurationDto } from './dto/upsert-marketing-sync-configuration.dto';
import { MarketingSyncService } from './marketing-sync.service';

@ApiTags('marketing-sync')
@UseGuards(ApiKeyGuard, JwtAuthGuard, PermissionGuard)
@RequirePermission('marketing_sync', 'view')
@Controller('marketing-sync')
export class MarketingSyncController {
  constructor(
    private readonly marketingSyncService: MarketingSyncService,
    private readonly marketingExtractProcessor: MarketingExtractProcessorService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @ApiOperation({
    summary: 'Lista configuracoes persistidas de sync de marketing',
  })
  @ApiQuery({
    name: 'syncKey',
    required: false,
    description: 'Filtra por chave do sync, ex.: marketing_extract.',
  })
  @ApiQuery({
    name: 'provider',
    required: false,
    description: 'Filtra por provider, ex.: google_ads ou meta_ads.',
  })
  @ApiOkResponse({ description: 'Configuracoes retornadas com sucesso.' })
  @Get('configurations')
  listConfigurations(@Query() query: MarketingSyncConfigurationsQueryDto) {
    return this.marketingSyncService.listConfigurations(query);
  }

  @ApiOperation({
    summary: 'Cria ou atualiza configuracao persistida de sync de marketing',
  })
  @ApiOkResponse({ description: 'Configuracao persistida com sucesso.' })
  @ApiBadRequestResponse({
    description:
      'Payload invalido. syncKey e obrigatorio e scheduleIntervalMinutes deve ser inteiro > 0.',
  })
  @Post('configurations')
  @RequirePermission('marketing_sync_config', 'update')
  async upsertConfiguration(
    @Body() body: UpsertMarketingSyncConfigurationDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const result = await this.marketingSyncService.upsertConfiguration(body);
    await this.recordMarketingAudit(
      'marketing_sync_configuration_upserted',
      actor,
      ip,
      result?.id,
      { userAgent, payload: body, after: result },
    );
    return result;
  }

  @ApiOperation({
    summary: 'Sincroniza contas acessiveis por provider',
  })
  @ApiQuery({
    name: 'provider',
    required: false,
    description: 'Filtra por provider, ex.: google_ads ou meta_ads.',
  })
  @ApiOkResponse({ description: 'Contas sincronizadas com sucesso.' })
  @Post('accounts/refresh')
  @RequirePermission('marketing_sync', 'create')
  async refreshAccounts(
    @Query('provider') provider: string | undefined,
    @CurrentUser() actor: AuthenticatedUser,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const result =
      await this.marketingSyncService.refreshAccountsForProvider(provider);
    await this.recordMarketingAudit('marketing_sync_accounts_refreshed', actor, ip, undefined, {
      userAgent,
      provider,
      result,
    });
    return result;
  }

  @ApiOperation({
    summary: 'Sincroniza contas acessiveis de uma conexao especifica',
  })
  @ApiOkResponse({ description: 'Conexao sincronizada com sucesso.' })
  @Post('connections/:connectionId/accounts/refresh')
  @RequirePermission('marketing_sync', 'create')
  async refreshAccountsForConnection(
    @Param('connectionId') connectionId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const result =
      await this.marketingSyncService.refreshAccountsForConnection(connectionId);
    await this.recordMarketingAudit(
      'marketing_sync_connection_accounts_refreshed',
      actor,
      ip,
      connectionId,
      { userAgent, result },
    );
    return result;
  }

  @ApiOperation({
    summary: 'Lista contas sincronizadas',
  })
  @Get('accounts')
  listAccounts(
    @Query('provider') provider?: string,
    @Query('connectionId') connectionId?: string,
    @Query('selected') selected?: string,
  ) {
    return this.marketingSyncService.listAccounts({
      provider,
      connectionId,
      selected,
    });
  }

  @ApiOperation({
    summary: 'Marca ou desmarca uma conta para extracao',
  })
  @ApiBadRequestResponse({ description: 'Conta nao encontrada.' })
  @Patch('accounts/:accountId/selection')
  @RequirePermission('marketing_sync_config', 'update')
  setAccountSelection(
    @Param('accountId') accountId: string,
    @Body() body: { selected?: boolean },
    @CurrentUser() actor: AuthenticatedUser,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.marketingSyncService.setAccountSelection(
      accountId,
      Boolean(body.selected),
    ).then(async (result) => {
      await this.recordMarketingAudit(
        'marketing_sync_account_selection_updated',
        actor,
        ip,
        accountId,
        { userAgent, selected: Boolean(body.selected), after: result },
      );
      return result;
    });
  }

  @ApiOperation({
    summary: 'Cria jobs diarios para contas selecionadas',
  })
  @Post('jobs/daily')
  @RequirePermission('marketing_sync', 'create')
  createDailyJobs(
    @Body()
    body: {
      provider?: string;
      includeToday?: boolean;
      enqueue?: boolean;
    },
    @CurrentUser() actor: AuthenticatedUser,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.marketingSyncService.createDailyJobs(body).then(async (result) => {
      await this.recordMarketingAudit('marketing_sync_daily_jobs_created', actor, ip, undefined, {
        userAgent,
        payload: body,
        result,
      });
      return result;
    });
  }

  @ApiOperation({
    summary: 'Cria jobs manuais para um intervalo customizado',
  })
  @ApiBadRequestResponse({
    description:
      'Payload invalido. dateFrom/dateTo sao obrigatorios no formato YYYY-MM-DD.',
  })
  @Post('jobs/manual')
  @RequirePermission('marketing_sync', 'create')
  createManualJobs(
    @Body()
    body: {
      provider?: string;
      accountId?: string;
      dateFrom?: string;
      dateTo?: string;
      enqueue?: boolean;
    },
    @CurrentUser() actor: AuthenticatedUser,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const payload = {
      provider: body.provider,
      accountId: body.accountId,
      dateFrom: body.dateFrom ?? '',
      dateTo: body.dateTo ?? '',
      enqueue: body.enqueue,
    };
    return this.marketingSyncService.createManualJobs(payload).then(async (result) => {
      await this.recordMarketingAudit('marketing_sync_manual_jobs_created', actor, ip, undefined, {
        userAgent,
        payload,
        result,
      });
      return result;
    });
  }

  @ApiOperation({
    summary: 'Lista jobs de extracao',
  })
  @Get('jobs')
  listJobs(
    @Query('provider') provider?: string,
    @Query('status') status?: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.marketingSyncService.listJobs({
      provider,
      status,
      accountId,
    });
  }

  @ApiOperation({
    summary: 'Lista payloads brutos da extracao',
  })
  @Get('raw')
  listRaw(
    @Query('provider') provider?: string,
    @Query('accountId') accountId?: string,
    @Query('jobId') jobId?: string,
    @Query('reportDate') reportDate?: string,
    @Query('limit') limit?: string,
  ) {
    return this.marketingSyncService.listRaw({
      provider,
      accountId,
      jobId,
      reportDate,
      limit,
    });
  }

  @ApiOperation({
    summary: 'Lista performance consolidada por campanha e dia',
  })
  @Get('performance')
  listPerformance(
    @Query('provider') provider?: string,
    @Query('accountId') accountId?: string,
    @Query('reportDate') reportDate?: string,
    @Query('limit') limit?: string,
  ) {
    return this.marketingSyncService.listPerformance({
      provider,
      accountId,
      reportDate,
      limit,
    });
  }

  @ApiOperation({
    summary: 'Exporta performance por anuncio em CSV',
  })
  @ApiQuery({ name: 'provider', required: false })
  @ApiQuery({ name: 'accountId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false, example: '2026-01-01' })
  @ApiQuery({ name: 'dateTo', required: false, example: '2026-04-27' })
  @ApiQuery({ name: 'limit', required: false, example: '5000' })
  @ApiProduces('text/csv')
  @Get('ad-performance/export/csv')
  async exportAdPerformanceCsv(
    @Query('provider') provider: string | undefined,
    @Query('accountId') accountId: string | undefined,
    @Query('dateFrom') dateFrom: string | undefined,
    @Query('dateTo') dateTo: string | undefined,
    @Query('limit') limit: string | undefined,
    @Res() res: Response,
    @CurrentUser() actor: AuthenticatedUser,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const csv = await this.marketingSyncService.exportAdPerformanceCsv({
      provider,
      accountId,
      dateFrom,
      dateTo,
      limit,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="marketing-ad-performance.csv"',
    );
    await this.recordMarketingAudit(
      'marketing_sync_ad_performance_exported',
      actor,
      ip,
      undefined,
      {
        userAgent,
        filters: { provider, accountId, dateFrom, dateTo, limit },
      },
    );
    res.send(csv);
  }

  @ApiOperation({
    summary: 'Importa performance por anuncio via CSV para teste operacional',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        provider: { type: 'string', example: 'google_ads' },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @ApiBadRequestResponse({
    description: 'CSV invalido ou arquivo ausente.',
  })
  @Post('ad-performance/import/csv')
  @RequirePermission('marketing_sync', 'create')
  @UseInterceptors(FileInterceptor('file'))
  async importAdPerformanceCsv(
    @UploadedFile() file: any,
    @Body('provider') provider: string | undefined,
    @CurrentUser() actor: AuthenticatedUser,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo CSV nao enviado.');
    }

    const result = await this.marketingSyncService.importAdPerformanceCsv({
      csvContent: file.buffer.toString('utf-8'),
      providerOverride: provider?.trim() || undefined,
    });
    await this.recordMarketingAudit(
      'marketing_sync_ad_performance_imported',
      actor,
      ip,
      undefined,
      {
        userAgent,
        provider,
        fileName: file.originalname,
        fileSize: file.size,
        result,
      },
    );
    return result;
  }

  @ApiOperation({
    summary: 'Enfileira manualmente um job de extracao',
  })
  @Post('jobs/:jobId/enqueue')
  @RequirePermission('marketing_sync', 'update')
  enqueueJob(
    @Param('jobId') jobId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.marketingSyncService
      .enqueueJob(jobId, 'http:manual')
      .then(async (result) => {
        await this.recordMarketingAudit(
          'marketing_sync_job_enqueued',
          actor,
          ip,
          jobId,
          { userAgent, result },
        );
        return result;
      });
  }

  @ApiOperation({
    summary: 'Processa manualmente um job de extracao',
  })
  @Post('jobs/:jobId/process')
  @RequirePermission('marketing_sync', 'update')
  processJob(
    @Param('jobId') jobId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.marketingExtractProcessor.processJob(jobId).then(async (result) => {
      await this.recordMarketingAudit(
        'marketing_sync_job_processed',
        actor,
        ip,
        jobId,
        { userAgent, result },
      );
      return result;
    });
  }

  private async recordMarketingAudit(
    action: string,
    actor: AuthenticatedUser,
    ip: string | undefined,
    resourceId: string | undefined,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.auditLogService.recordSafe({
      userId: actor.id,
      action,
      resource: 'marketing_sync',
      resourceId,
      ip,
      metadata: {
        actorEmail: actor.email,
        ...metadata,
      },
    });
  }
}
