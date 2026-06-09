import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { MetaAdsService } from './meta-ads.service';

@ApiTags('meta-ads')
@UseGuards(ApiKeyGuard)
@Controller('meta-ads')
export class MetaAdsController {
  constructor(private readonly metaAdsService: MetaAdsService) {}

  // ─── Batch sync endpoints ─────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Recuperar Campanhas de Conta (Batch)',
    description:
      'Busca campanhas de uma ou mais contas via Graph API Batch e persiste em meta_campaigns_raw.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        connectionId: { type: 'string' },
        accountIds: { type: 'array', items: { type: 'string' } },
        datePreset: {
          type: 'string',
          enum: ['today', 'yesterday', 'last_7d', 'last_14d', 'last_30d', 'last_90d', 'this_month', 'last_month'],
          example: 'last_30d',
        },
        since: { type: 'string', example: '2025-05-01' },
        until: { type: 'string', example: '2025-05-22' },
      },
      required: ['connectionId'],
    },
  })
  @Post('sync/campaigns')
  syncCampaigns(
    @Body()
    body: {
      connectionId?: string;
      accountIds?: string[];
      datePreset?: string;
      since?: string;
      until?: string;
    },
  ) {
    return this.metaAdsService.syncCampaigns({
      triggeredBy: 'http',
      connectionId: body.connectionId,
      accountIds: body.accountIds,
      datePreset: body.datePreset,
      since: body.since,
      until: body.until,
    });
  }

  @ApiOperation({
    summary: 'Recuperar Conjunto de Anúncios de Conta (Batch)',
    description:
      'Busca conjuntos de anúncios de uma ou mais contas via Graph API Batch e persiste em meta_adsets_raw.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        connectionId: { type: 'string' },
        accountIds: { type: 'array', items: { type: 'string' } },
        datePreset: { type: 'string', example: 'last_30d' },
        since: { type: 'string', example: '2025-05-01' },
        until: { type: 'string', example: '2025-05-22' },
      },
      required: ['connectionId'],
    },
  })
  @Post('sync/adsets')
  syncAdsets(
    @Body()
    body: {
      connectionId?: string;
      accountIds?: string[];
      datePreset?: string;
      since?: string;
      until?: string;
    },
  ) {
    return this.metaAdsService.syncAdsets({
      triggeredBy: 'http',
      connectionId: body.connectionId,
      accountIds: body.accountIds,
      datePreset: body.datePreset,
      since: body.since,
      until: body.until,
    });
  }

  @ApiOperation({
    summary: 'Recuperar Anúncios de Conta (Batch)',
    description:
      'Busca anúncios (com criativos) de uma ou mais contas via Graph API Batch e persiste em meta_ads_raw.',
  })
  @Post('sync/ads')
  syncAds(
    @Body()
    body: {
      connectionId?: string;
      accountIds?: string[];
      datePreset?: string;
      since?: string;
      until?: string;
    },
  ) {
    return this.metaAdsService.syncAds({
      triggeredBy: 'http',
      connectionId: body.connectionId,
      accountIds: body.accountIds,
      datePreset: body.datePreset,
      since: body.since,
      until: body.until,
    });
  }

  @ApiOperation({
    summary: 'Recuperar Insights Anúncios de Conta (Batch)',
    description:
      'Busca insights de anúncios (com métricas de vídeo e breakdown por plataforma) via Batch. ' +
      'Persiste em meta_ad_performance com CPC/CTR/CPM calculados.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        connectionId: { type: 'string' },
        accountIds: { type: 'array', items: { type: 'string' } },
        datePreset: { type: 'string', example: 'last_7d' },
        since: { type: 'string', example: '2025-05-01' },
        until: { type: 'string', example: '2025-05-22' },
        level: {
          type: 'string',
          enum: ['ad', 'adset', 'campaign'],
          default: 'ad',
        },
        breakdowns: {
          type: 'string',
          default: 'publisher_platform',
          description: 'Breakdown por plataforma. Use publisher_platform para separar Facebook/Instagram.',
        },
      },
      required: ['connectionId'],
    },
  })
  @Post('sync/insights')
  syncInsights(
    @Body()
    body: {
      connectionId?: string;
      accountIds?: string[];
      datePreset?: string;
      since?: string;
      until?: string;
      level?: 'ad' | 'adset' | 'campaign';
      breakdowns?: string;
    },
  ) {
    return this.metaAdsService.enqueueInsightsSync({
      triggeredBy: 'http',
      connectionId: body.connectionId,
      accountIds: body.accountIds,
      datePreset: body.datePreset,
      since: body.since,
      until: body.until,
      level: body.level,
      breakdowns: body.breakdowns,
    });
  }

  @ApiOperation({
    summary: 'Sync completo (campanhas + conjuntos + anúncios + insights)',
    description: 'Executa todos os 4 passos em paralelo para todas as contas selecionadas.',
  })
  @Post('sync/all')
  syncAll(
    @Body()
    body: {
      connectionId?: string;
      datePreset?: string;
      since?: string;
      until?: string;
    },
  ) {
    return this.metaAdsService.syncAll({
      triggeredBy: 'http',
      connectionId: body.connectionId,
      datePreset: body.datePreset,
      since: body.since,
      until: body.until,
    });
  }

  // ─── Async job endpoints (Curls 5-7) ─────────────────────────────────────

  @ApiOperation({
    summary: 'Recuperar Insights de um Node (Job)',
    description:
      'Inicia um job assíncrono de insights para um node (conta, campanha, adset ou anúncio). ' +
      'Retorna report_run_id para polling. Use para períodos > 7 dias.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        connectionId: { type: 'string' },
        nodeId: {
          type: 'string',
          description: 'ID do node: act_{account_id}, campaign_id, adset_id ou ad_id',
        },
        since: { type: 'string', example: '2025-01-01' },
        until: { type: 'string', example: '2025-05-22' },
        level: {
          type: 'string',
          enum: ['ad', 'adset', 'campaign', 'account'],
          default: 'ad',
        },
        fields: {
          type: 'array',
          items: { type: 'string' },
          description: 'Campos a incluir. Padrão: impressions, clicks, spend, ctr, cpc, cpm, actions.',
        },
        breakdowns: { type: 'string', example: 'publisher_platform' },
      },
      required: ['connectionId', 'nodeId', 'since', 'until'],
    },
  })
  @Post('jobs/insights')
  startInsightsJob(
    @Body()
    body: {
      connectionId: string;
      nodeId: string;
      since: string;
      until: string;
      level?: string;
      fields?: string[];
      breakdowns?: string;
    },
  ) {
    return this.metaAdsService.startInsightsJob({
      connectionId: body.connectionId,
      nodeId: body.nodeId,
      fields: body.fields,
      level: body.level ?? 'ad',
      since: body.since,
      until: body.until,
      breakdowns: body.breakdowns,
    });
  }

  @ApiOperation({
    summary: 'Verificar Job',
    description: 'Verifica o status de um job assíncrono de insights pelo report_run_id.',
  })
  @Get('jobs/:reportRunId/check')
  checkJob(
    @Param('reportRunId') reportRunId: string,
    @Query('connectionId') connectionId: string,
  ) {
    return this.metaAdsService.checkAsyncJob({ connectionId, reportRunId });
  }

  @ApiOperation({
    summary: 'Recuperar Job',
    description: 'Recupera os resultados de um job concluído. Pode salvar automaticamente com ?save=true.',
  })
  @Get('jobs/:reportRunId')
  getJob(
    @Param('reportRunId') reportRunId: string,
    @Query('connectionId') connectionId: string,
    @Query('accountId') accountId?: string,
    @Query('save') save?: string,
  ) {
    return this.metaAdsService.getAsyncJobResults({
      connectionId,
      reportRunId,
      accountId,
      save: save === 'true',
    });
  }

  // ─── Data query endpoints ─────────────────────────────────────────────────

  @ApiOperation({ summary: 'Listar campanhas brutas' })
  @ApiQuery({ name: 'accountId', required: false })
  @ApiQuery({ name: 'status', required: false, example: 'ACTIVE' })
  @ApiQuery({ name: 'limit', required: false, example: 100 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  @Get('data/campaigns')
  getCampaigns(
    @Query('accountId') accountId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.metaAdsService.getCampaigns({
      accountId,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @ApiOperation({ summary: 'Listar conjuntos de anúncios brutos' })
  @Get('data/adsets')
  getAdsets(
    @Query('accountId') accountId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.metaAdsService.getAdsets({
      accountId,
      campaignId,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @ApiOperation({ summary: 'Listar anúncios brutos (com criativos)' })
  @Get('data/ads')
  getAds(
    @Query('accountId') accountId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('adsetId') adsetId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.metaAdsService.getAds({
      accountId,
      campaignId,
      adsetId,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @ApiOperation({ summary: 'Resumo agregado de performance (KPIs)' })
  @ApiQuery({ name: 'accountId', required: false })
  @ApiQuery({ name: 'campaignId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false, example: '2025-05-01' })
  @ApiQuery({ name: 'dateTo', required: false, example: '2025-05-22' })
  @ApiQuery({
    name: 'platform',
    required: false,
    description: 'total, facebook, instagram, audience_network, messenger',
  })
  @Get('data/summary')
  getSummary(
    @Query('accountId') accountId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('platform') platform?: string,
  ) {
    return this.metaAdsService.getPerformanceSummary({
      accountId,
      campaignId,
      dateFrom,
      dateTo,
      platform,
    });
  }

  @ApiOperation({ summary: 'Série temporal de performance (para gráficos)' })
  @Get('data/timeseries')
  getTimeseries(
    @Query('accountId') accountId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('platform') platform?: string,
  ) {
    return this.metaAdsService.getPerformanceTimeseries({
      accountId,
      campaignId,
      dateFrom,
      dateTo,
      platform,
    });
  }

  @ApiOperation({ summary: 'Performance detalhada por campanha' })
  @Get('data/campaigns-breakdown')
  getCampaignsBreakdown(
    @Query('accountId') accountId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('platform') platform?: string,
  ) {
    return this.metaAdsService.getCampaignBreakdown({
      accountId,
      dateFrom,
      dateTo,
      platform,
    });
  }

  @ApiOperation({ summary: 'Performance por anúncio e dia (granular)' })
  @Get('data/performance')
  getPerformance(
    @Query('accountId') accountId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('adsetId') adsetId?: string,
    @Query('adId') adId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('platform') platform?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.metaAdsService.getPerformance({
      accountId,
      campaignId,
      adsetId,
      adId,
      dateFrom,
      dateTo,
      platform,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @ApiOperation({ summary: 'Histórico de execuções de sync' })
  @Get('executions')
  getExecutions(
    @Query('step') step?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.metaAdsService.getExecutionHistory({
      step,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @ApiOperation({ summary: 'Exportar performance em CSV' })
  @Get('data/export/csv')
  async exportCsv(
    @Query('accountId') accountId: string | undefined,
    @Query('dateFrom') dateFrom: string | undefined,
    @Query('dateTo') dateTo: string | undefined,
    @Query('platform') platform: string | undefined,
    @Query('limit') limit: string | undefined,
    @Res() res: Response,
  ) {
    const csv = await this.metaAdsService.exportPerformanceCsv({
      accountId,
      dateFrom,
      dateTo,
      platform,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="meta-ads-performance.csv"',
    );
    res.send(csv);
  }

  @ApiOperation({ summary: 'Importar performance via CSV' })
  @Post('data/import/csv')
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(@UploadedFile() file: { buffer: Buffer }) {
    if (!file) throw new BadRequestException('Arquivo CSV não enviado.');
    return this.metaAdsService.importPerformanceCsv(file.buffer.toString('utf-8'));
  }
}
