import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { LaunchDashboardQueryDto } from './dto/launch-dashboard-query.dto';
import { UpsertLaunchDashboardConfigDto } from './dto/upsert-launch-dashboard-config.dto';
import { LaunchDashboardService } from './launch-dashboard.service';

@ApiTags('launch-dashboard')
@UseGuards(ApiKeyGuard, JwtAuthGuard, PermissionGuard)
@RequirePermission('launch_dashboard', 'view')
@Controller('launch-dashboard')
export class LaunchDashboardController {
  constructor(private readonly service: LaunchDashboardService) {}

  // ─── Launches ─────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Lista todos os lançamentos' })
  @Get('launches')
  getLaunches() {
    return this.service.getLaunches();
  }

  // ─── Config ───────────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Retorna configuração do dashboard para o lançamento',
  })
  @ApiParam({ name: 'launchId', type: 'string' })
  @Get('config/:launchId')
  getConfig(@Param('launchId') launchId: string) {
    return this.service.getConfig(launchId);
  }

  @ApiOperation({
    summary: 'Cria ou atualiza configuração do dashboard para o lançamento',
  })
  @ApiParam({ name: 'launchId', type: 'string' })
  @Put('config/:launchId')
  @RequirePermission('launch_dashboard', 'update')
  upsertConfig(
    @Param('launchId') launchId: string,
    @Body() dto: UpsertLaunchDashboardConfigDto,
  ) {
    return this.service.upsertConfig(launchId, dto);
  }

  // ─── Notifications ───────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Lista todos os monitoramentos configurados com métricas atuais',
  })
  @Get('notifications')
  getNotifications() {
    return this.service.getNotifications();
  }

  // ─── Available questions ──────────────────────────────────────────────────

  @ApiOperation({
    summary:
      'Lista perguntas disponíveis e suas opções para configuração de consciência',
  })
  @ApiQuery({ name: 'launchId', required: false })
  @ApiQuery({ name: 'seasonId', required: false })
  @Get('available-questions')
  getAvailableQuestions(
    @Query('launchId') launchId?: string,
    @Query('seasonId') seasonId?: string,
  ) {
    return this.service.getAvailableQuestions(launchId, seasonId);
  }

  // ─── Ad accounts ─────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Lista contas de anúncio com dados no período' })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @Get('ad-accounts')
  getAdAccounts(@Query() query: LaunchDashboardQueryDto) {
    return this.service.getAdAccounts(query);
  }

  // ─── Summary ──────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'KPIs agregados do funil de lançamento' })
  @ApiQuery({ name: 'launchId', required: false })
  @ApiQuery({ name: 'seasonId', required: false })
  @ApiQuery({ name: 'dateFrom', required: true, example: '2026-04-01' })
  @ApiQuery({ name: 'dateTo', required: true, example: '2026-04-30' })
  @ApiQuery({ name: 'externalAccountId', required: false })
  @ApiQuery({ name: 'externalCampaignId', required: false })
  @ApiQuery({ name: 'externalAdsetId', required: false })
  @ApiQuery({ name: 'externalAdId', required: false })
  @Get('summary')
  getSummary(@Query() query: LaunchDashboardQueryDto) {
    return this.service.getSummary(query);
  }

  // ─── Timeseries ───────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Série temporal diária do funil de lançamento' })
  @ApiQuery({ name: 'launchId', required: false })
  @ApiQuery({ name: 'seasonId', required: false })
  @ApiQuery({ name: 'dateFrom', required: true, example: '2026-04-01' })
  @ApiQuery({ name: 'dateTo', required: true, example: '2026-04-30' })
  @Get('timeseries')
  getTimeseries(@Query() query: LaunchDashboardQueryDto) {
    return this.service.getTimeseries(query);
  }

  // ─── Funnel table ─────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Tabela de funil por anúncio' })
  @ApiQuery({ name: 'launchId', required: false })
  @ApiQuery({ name: 'seasonId', required: false })
  @ApiQuery({ name: 'dateFrom', required: true, example: '2026-04-01' })
  @ApiQuery({ name: 'dateTo', required: true, example: '2026-04-30' })
  @ApiQuery({ name: 'externalAccountId', required: false })
  @ApiQuery({ name: 'externalCampaignId', required: false })
  @ApiQuery({ name: 'externalAdsetId', required: false })
  @ApiQuery({ name: 'externalAdId', required: false })
  @ApiQuery({
    name: 'groupBy',
    required: false,
    enum: ['ad', 'adName'],
    description:
      'ad (default) = uma linha por external_ad_id; adName = consolida anúncios com o mesmo nome',
  })
  @Get('funnel')
  getFunnelTable(@Query() query: LaunchDashboardQueryDto) {
    return this.service.getFunnelTable(query);
  }

  // ─── Awareness metrics ────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Métricas de consciência e engajamento com pesquisa (formulário)',
  })
  @ApiQuery({ name: 'launchId', required: false })
  @ApiQuery({ name: 'seasonId', required: false })
  @ApiQuery({ name: 'dateFrom', required: true, example: '2026-04-01' })
  @ApiQuery({ name: 'dateTo', required: true, example: '2026-04-30' })
  @Get('awareness')
  getAwarenessMetrics(@Query() query: LaunchDashboardQueryDto) {
    return this.service.getAwarenessMetrics(query);
  }

  // ─── Tier distribution ────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Distribuição de leads por faixa de leadscore (A+, A, B, C, D, E)',
  })
  @ApiQuery({ name: 'launchId', required: false })
  @ApiQuery({ name: 'seasonId', required: false })
  @ApiQuery({ name: 'dateFrom', required: true, example: '2026-04-01' })
  @ApiQuery({ name: 'dateTo', required: true, example: '2026-04-30' })
  @Get('tier-distribution')
  getTierDistribution(@Query() query: LaunchDashboardQueryDto) {
    return this.service.getTierDistribution(query);
  }
}
