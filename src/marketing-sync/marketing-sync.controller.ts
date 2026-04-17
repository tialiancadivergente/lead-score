import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
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
