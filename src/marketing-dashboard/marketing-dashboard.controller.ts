import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { MarketingDashboardFiltersQueryDto } from './dto/marketing-dashboard-filters-query.dto';
import { MarketingDashboardSummaryQueryDto } from './dto/marketing-dashboard-summary-query.dto';
import { MarketingDashboardTableQueryDto } from './dto/marketing-dashboard-table-query.dto';
import { MarketingDashboardService } from './marketing-dashboard.service';

@ApiTags('marketing-dashboard')
@UseGuards(ApiKeyGuard)
@Controller('marketing-dashboard')
export class MarketingDashboardController {
  constructor(
    private readonly marketingDashboardService: MarketingDashboardService,
  ) {}

  @ApiOperation({
    summary: 'Opcoes de filtros read-only do dashboard de marketing',
  })
  @ApiQuery({ name: 'provider', required: false })
  @ApiQuery({ name: 'externalAccountId', required: false })
  @ApiQuery({ name: 'externalCampaignId', required: false })
  @ApiQuery({ name: 'externalAdsetId', required: false })
  @ApiQuery({ name: 'externalAdId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false, example: '2026-04-01' })
  @ApiQuery({ name: 'dateTo', required: false, example: '2026-04-16' })
  @ApiQuery({ name: 'launchId', required: false })
  @ApiQuery({ name: 'seasonId', required: false })
  @ApiOkResponse({ description: 'Opcoes de filtros retornadas com sucesso.' })
  @ApiBadRequestResponse({
    description:
      'Parametros invalidos. dateFrom e dateTo devem ser enviados juntos e no formato YYYY-MM-DD.',
  })
  @Get('filters')
  getFilters(@Query() query: MarketingDashboardFiltersQueryDto) {
    return this.marketingDashboardService.getFilters(query);
  }

  @ApiOperation({
    summary: 'Resumo read-only do dashboard de marketing por anuncio',
  })
  @ApiQuery({ name: 'provider', required: false })
  @ApiQuery({ name: 'externalAccountId', required: false })
  @ApiQuery({ name: 'externalCampaignId', required: false })
  @ApiQuery({ name: 'externalAdsetId', required: false })
  @ApiQuery({ name: 'externalAdId', required: false })
  @ApiQuery({ name: 'dateFrom', required: true, example: '2026-04-01' })
  @ApiQuery({ name: 'dateTo', required: true, example: '2026-04-16' })
  @ApiQuery({ name: 'launchId', required: false })
  @ApiQuery({ name: 'seasonId', required: false })
  @ApiOkResponse({ description: 'Resumo consolidado calculado com sucesso.' })
  @ApiBadRequestResponse({
    description: 'Parametros invalidos. dateFrom e dateTo sao obrigatorios.',
  })
  @Get('summary')
  getSummary(@Query() query: MarketingDashboardSummaryQueryDto) {
    return this.marketingDashboardService.getSummary(query);
  }

  @ApiOperation({
    summary: 'Serie temporal read-only do dashboard de marketing por anuncio',
  })
  @ApiQuery({ name: 'provider', required: false })
  @ApiQuery({ name: 'externalAccountId', required: false })
  @ApiQuery({ name: 'externalCampaignId', required: false })
  @ApiQuery({ name: 'externalAdsetId', required: false })
  @ApiQuery({ name: 'externalAdId', required: false })
  @ApiQuery({ name: 'dateFrom', required: true, example: '2026-04-01' })
  @ApiQuery({ name: 'dateTo', required: true, example: '2026-04-16' })
  @ApiQuery({ name: 'launchId', required: false })
  @ApiQuery({ name: 'seasonId', required: false })
  @ApiOkResponse({ description: 'Serie temporal consolidada calculada com sucesso.' })
  @ApiBadRequestResponse({
    description: 'Parametros invalidos. dateFrom e dateTo sao obrigatorios.',
  })
  @Get('timeseries')
  getTimeseries(@Query() query: MarketingDashboardSummaryQueryDto) {
    return this.marketingDashboardService.getTimeseries(query);
  }

  @ApiOperation({
    summary: 'Tabela read-only do dashboard de marketing por anuncio',
  })
  @ApiQuery({ name: 'provider', required: false })
  @ApiQuery({ name: 'externalAccountId', required: false })
  @ApiQuery({ name: 'externalCampaignId', required: false })
  @ApiQuery({ name: 'externalAdsetId', required: false })
  @ApiQuery({ name: 'externalAdId', required: false })
  @ApiQuery({ name: 'dateFrom', required: true, example: '2026-04-01' })
  @ApiQuery({ name: 'dateTo', required: true, example: '2026-04-16' })
  @ApiQuery({ name: 'launchId', required: false })
  @ApiQuery({ name: 'seasonId', required: false })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'pageSize', required: false, example: '25' })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    example: 'spend',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    example: 'desc',
  })
  @ApiOkResponse({ description: 'Tabela consolidada calculada com sucesso.' })
  @ApiBadRequestResponse({
    description:
      'Parametros invalidos. dateFrom e dateTo sao obrigatorios e sortBy deve estar na whitelist.',
  })
  @Get('table')
  getTable(@Query() query: MarketingDashboardTableQueryDto) {
    return this.marketingDashboardService.getTable(query);
  }
}
