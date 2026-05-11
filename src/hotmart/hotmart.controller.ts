import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { HotmartProcessorService } from './hotmart-processor.service';
import { HotmartService } from './hotmart.service';

@ApiTags('hotmart')
@Controller('hotmart')
export class HotmartController {
  constructor(
    private readonly hotmartService: HotmartService,
    private readonly processorService: HotmartProcessorService,
  ) {}

  @ApiOperation({ summary: 'Recebe webhook de eventos de venda da Hotmart' })
  @ApiQuery({ name: 'hottok', required: false })
  @Post('webhook')
  receiveWebhook(
    @Body() payload: Record<string, unknown>,
    @Query('hottok') hottok?: string,
  ) {
    return this.hotmartService.receiveWebhook(payload, hottok);
  }

  // ── Endpoints protegidos ──────────────────────────────────────────────────

  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Lista registros raw de vendas Hotmart' })
  @ApiQuery({ name: 'limit', required: false })
  @Get('raw')
  listRaw(@Query('limit') limit?: string) {
    return this.hotmartService.listRaw(limit ? Number.parseInt(limit, 10) : 50);
  }

  @UseGuards(ApiKeyGuard)
  @ApiOperation({
    summary:
      'Sincroniza vendas históricas da API Hotmart (executa em background)',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'ISO date, ex.: 2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'ISO date, ex.: 2024-12-31',
  })
  @ApiQuery({
    name: 'transactionStatus',
    required: false,
    description: 'Status separados por vírgula. Default: APPROVED,COMPLETE',
  })
  @Post('sync-history')
  syncHistory(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('transactionStatus') transactionStatus?: string,
  ) {
    // Fire-and-forget: retorna imediatamente, sync roda em background
    this.hotmartService
      .syncHistory({ startDate, endDate, transactionStatus })
      .catch(() => undefined);
    return { status: 'started', message: 'Sync iniciado em background' };
  }

  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Processa em lote registros raw pendentes' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Máximo de registros (default: 100)',
  })
  @Post('process-batch')
  processBatch(@Query('limit') limit?: string) {
    return this.processorService.processBatch(
      limit ? Number.parseInt(limit, 10) : 100,
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Lista vendas processadas (hotmart_sale)' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'APPROVED | COMPLETE | CANCELLED | REFUNDED | WAITING_PAYMENT',
  })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'sourceAccount', required: false })
  @ApiQuery({ name: 'personId', required: false })
  @ApiQuery({ name: 'from', required: false, description: 'ISO date' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO date' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Get('sales')
  listSales(
    @Query('status') status?: string,
    @Query('productId') productId?: string,
    @Query('sourceAccount') sourceAccount?: string,
    @Query('personId') personId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.hotmartService.listSales({
      status,
      productId: productId ? Number(productId) : undefined,
      sourceAccount,
      personId,
      from,
      to,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Resumo agregado de vendas Hotmart' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'sourceAccount', required: false })
  @Get('sales/summary')
  getSalesSummary(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('sourceAccount') sourceAccount?: string,
  ) {
    return this.hotmartService.getSalesSummary({ from, to, sourceAccount });
  }
}
