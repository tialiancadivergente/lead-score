import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { HotmartProcessorService } from './hotmart-processor.service';
import { HotmartProductService } from './hotmart-product.service';
import { HotmartSyncScheduleService } from './hotmart-sync-schedule.service';
import { HotmartService } from './hotmart.service';

@ApiTags('hotmart')
@Controller('hotmart')
export class HotmartController {
  constructor(
    private readonly hotmartService: HotmartService,
    private readonly processorService: HotmartProcessorService,
    private readonly hotmartProductService: HotmartProductService,
    private readonly hotmartSyncScheduleService: HotmartSyncScheduleService,
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
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('vendas_hotmart', 'view')
  @ApiOperation({ summary: 'Lista registros raw de vendas Hotmart' })
  @ApiQuery({ name: 'limit', required: false })
  @Get('raw')
  listRaw(@Query('limit') limit?: string) {
    return this.hotmartService.listRaw(limit ? Number.parseInt(limit, 10) : 50);
  }

  @UseGuards(ApiKeyGuard)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('vendas_hotmart', 'create')
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
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('vendas_hotmart', 'create')
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
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('vendas_hotmart', 'view')
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
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('vendas_hotmart', 'view')
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

  // ── Produtos Hotmart (config de mapeamento launch→produto) ────────────────

  @UseGuards(ApiKeyGuard)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('vendas_hotmart', 'view')
  @ApiOperation({
    summary: 'Lista configurações de produtos Hotmart por launch',
  })
  @Get('products')
  listProducts() {
    return this.hotmartProductService.listAll();
  }

  @UseGuards(ApiKeyGuard)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('vendas_hotmart', 'create')
  @ApiOperation({ summary: 'Cria configuração de produto Hotmart' })
  @Post('products')
  createProduct(@Body() body: Record<string, unknown>) {
    return this.hotmartProductService.create({
      launch_id: body.launch_id as string | undefined,
      name: body.name as string,
      product_id: Number(body.product_id),
      active: body.active === undefined ? true : Boolean(body.active),
    });
  }

  @UseGuards(ApiKeyGuard)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('vendas_hotmart', 'update')
  @ApiOperation({ summary: 'Atualiza configuração de produto Hotmart' })
  @Patch('products/:id')
  updateProduct(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.hotmartProductService.update(id, {
      launch_id:
        body.launch_id === null ? null : (body.launch_id as string | undefined),
      name: body.name as string | undefined,
      product_id:
        body.product_id === undefined ? undefined : Number(body.product_id),
      active: body.active === undefined ? undefined : Boolean(body.active),
    });
  }

  @UseGuards(ApiKeyGuard)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('vendas_hotmart', 'delete')
  @ApiOperation({ summary: 'Remove configuração de produto Hotmart' })
  @Delete('products/:id')
  removeProduct(@Param('id') id: string) {
    return this.hotmartProductService.remove(id);
  }

  // ── Sync Schedules ────────────────────────────────────────────────────────

  @UseGuards(ApiKeyGuard)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('vendas_hotmart', 'view')
  @ApiOperation({ summary: 'Lista agendamentos de sync Hotmart' })
  @Get('sync-schedules')
  listSchedules() {
    return this.hotmartSyncScheduleService.listAll();
  }

  @UseGuards(ApiKeyGuard)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('vendas_hotmart', 'create')
  @ApiOperation({ summary: 'Cria agendamento de sync Hotmart' })
  @Post('sync-schedules')
  createSchedule(@Body() body: Record<string, unknown>) {
    return this.hotmartSyncScheduleService.create({
      name: body.name as string | undefined,
      period_preset: body.period_preset as string,
      date_from: body.date_from as string | undefined,
      date_to: body.date_to as string | undefined,
      transaction_status: body.transaction_status as string | undefined,
      scheduled_time: body.scheduled_time as string,
      active: body.active === undefined ? true : Boolean(body.active),
    });
  }

  @UseGuards(ApiKeyGuard)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('vendas_hotmart', 'delete')
  @ApiOperation({ summary: 'Remove agendamento de sync Hotmart' })
  @Delete('sync-schedules/:id')
  removeSchedule(@Param('id') id: string) {
    return this.hotmartSyncScheduleService.remove(id);
  }

  @UseGuards(ApiKeyGuard)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('vendas_hotmart', 'update')
  @ApiOperation({
    summary: 'Executa agendamento de sync Hotmart imediatamente',
  })
  @Post('sync-schedules/:id/run')
  runScheduleNow(@Param('id') id: string) {
    return this.hotmartSyncScheduleService.runNow(id);
  }
}
