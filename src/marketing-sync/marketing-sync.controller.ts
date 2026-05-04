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
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { MarketingExtractProcessorService } from './marketing-extract-processor.service';
import { MarketingSyncConfigurationsQueryDto } from './dto/marketing-sync-configurations-query.dto';
import { UpsertMarketingSyncConfigurationDto } from './dto/upsert-marketing-sync-configuration.dto';
import { MarketingSyncService } from './marketing-sync.service';

@ApiTags('marketing-sync')
@UseGuards(ApiKeyGuard)
@Controller('marketing-sync')
export class MarketingSyncController {
  constructor(
    private readonly marketingSyncService: MarketingSyncService,
    private readonly marketingExtractProcessor: MarketingExtractProcessorService,
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
  upsertConfiguration(@Body() body: UpsertMarketingSyncConfigurationDto) {
    return this.marketingSyncService.upsertConfiguration(body);
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
  refreshAccounts(@Query('provider') provider?: string) {
    return this.marketingSyncService.refreshAccountsForProvider(provider);
  }

  @ApiOperation({
    summary: 'Sincroniza contas acessiveis de uma conexao especifica',
  })
  @ApiOkResponse({ description: 'Conexao sincronizada com sucesso.' })
  @Post('connections/:connectionId/accounts/refresh')
  refreshAccountsForConnection(@Param('connectionId') connectionId: string) {
    return this.marketingSyncService.refreshAccountsForConnection(connectionId);
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
  setAccountSelection(
    @Param('accountId') accountId: string,
    @Body() body: { selected?: boolean },
  ) {
    return this.marketingSyncService.setAccountSelection(
      accountId,
      Boolean(body.selected),
    );
  }

  @ApiOperation({
    summary: 'Cria jobs diarios para contas selecionadas',
  })
  @Post('jobs/daily')
  createDailyJobs(
    @Body()
    body: {
      provider?: string;
      includeToday?: boolean;
      enqueue?: boolean;
    },
  ) {
    return this.marketingSyncService.createDailyJobs(body);
  }

  @ApiOperation({
    summary: 'Cria jobs manuais para um intervalo customizado',
  })
  @ApiBadRequestResponse({
    description:
      'Payload invalido. dateFrom/dateTo sao obrigatorios no formato YYYY-MM-DD.',
  })
  @Post('jobs/manual')
  createManualJobs(
    @Body()
    body: {
      provider?: string;
      accountId?: string;
      dateFrom?: string;
      dateTo?: string;
      enqueue?: boolean;
    },
  ) {
    return this.marketingSyncService.createManualJobs({
      provider: body.provider,
      accountId: body.accountId,
      dateFrom: body.dateFrom ?? '',
      dateTo: body.dateTo ?? '',
      enqueue: body.enqueue,
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
  @UseInterceptors(FileInterceptor('file'))
  async importAdPerformanceCsv(
    @UploadedFile() file: any,
    @Body('provider') provider: string | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo CSV nao enviado.');
    }

    return this.marketingSyncService.importAdPerformanceCsv({
      csvContent: file.buffer.toString('utf-8'),
      providerOverride: provider?.trim() || undefined,
    });
  }

  @ApiOperation({
    summary: 'Enfileira manualmente um job de extracao',
  })
  @Post('jobs/:jobId/enqueue')
  enqueueJob(@Param('jobId') jobId: string) {
    return this.marketingSyncService.enqueueJob(jobId, 'http:manual');
  }

  @ApiOperation({
    summary: 'Processa manualmente um job de extracao',
  })
  @Post('jobs/:jobId/process')
  processJob(@Param('jobId') jobId: string) {
    return this.marketingExtractProcessor.processJob(jobId);
  }
}
