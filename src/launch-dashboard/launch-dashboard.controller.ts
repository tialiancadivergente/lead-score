import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { LaunchDashboardQueryDto } from './dto/launch-dashboard-query.dto';
import { LaunchDashboardService } from './launch-dashboard.service';

@ApiTags('launch-dashboard')
@UseGuards(ApiKeyGuard)
@Controller('launch-dashboard')
export class LaunchDashboardController {
  constructor(private readonly service: LaunchDashboardService) {}

  @ApiOperation({ summary: 'Lista todos os lançamentos' })
  @ApiOkResponse({ description: 'Lista de lançamentos.' })
  @Get('launches')
  getLaunches() {
    return this.service.getLaunches();
  }

  @ApiOperation({ summary: 'KPIs agregados do funil de lançamento' })
  @ApiQuery({ name: 'launchId', required: false })
  @ApiQuery({ name: 'seasonId', required: false })
  @ApiQuery({ name: 'dateFrom', required: true, example: '2026-04-01' })
  @ApiQuery({ name: 'dateTo', required: true, example: '2026-04-30' })
  @ApiQuery({ name: 'externalAccountId', required: false })
  @ApiQuery({ name: 'externalCampaignId', required: false })
  @ApiQuery({ name: 'externalAdsetId', required: false })
  @ApiQuery({ name: 'externalAdId', required: false })
  @ApiOkResponse({ description: 'KPIs do funil calculados.' })
  @Get('summary')
  getSummary(@Query() query: LaunchDashboardQueryDto) {
    return this.service.getSummary(query);
  }

  @ApiOperation({ summary: 'Série temporal diária do funil de lançamento' })
  @ApiQuery({ name: 'launchId', required: false })
  @ApiQuery({ name: 'seasonId', required: false })
  @ApiQuery({ name: 'dateFrom', required: true, example: '2026-04-01' })
  @ApiQuery({ name: 'dateTo', required: true, example: '2026-04-30' })
  @ApiOkResponse({ description: 'Série temporal retornada.' })
  @Get('timeseries')
  getTimeseries(@Query() query: LaunchDashboardQueryDto) {
    return this.service.getTimeseries(query);
  }

  @ApiOperation({ summary: 'Tabela de funil por anúncio' })
  @ApiQuery({ name: 'launchId', required: false })
  @ApiQuery({ name: 'seasonId', required: false })
  @ApiQuery({ name: 'dateFrom', required: true, example: '2026-04-01' })
  @ApiQuery({ name: 'dateTo', required: true, example: '2026-04-30' })
  @ApiQuery({ name: 'externalAccountId', required: false })
  @ApiQuery({ name: 'externalCampaignId', required: false })
  @ApiQuery({ name: 'externalAdsetId', required: false })
  @ApiQuery({ name: 'externalAdId', required: false })
  @ApiOkResponse({ description: 'Tabela de funil por anúncio retornada.' })
  @Get('funnel')
  getFunnelTable(@Query() query: LaunchDashboardQueryDto) {
    return this.service.getFunnelTable(query);
  }
}
