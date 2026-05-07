import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { HotmartService } from './hotmart.service';

@ApiTags('hotmart')
@Controller('hotmart')
export class HotmartController {
  constructor(private readonly hotmartService: HotmartService) {}

  /**
   * Endpoint público — Hotmart envia POST para esta URL.
   * Configure em: Hotmart > Ferramentas > Webhook > URL para envio de dados
   * O hottok chega como query param: POST /hotmart/webhook?hottok=SEU_TOKEN
   */
  @ApiOperation({ summary: 'Recebe webhook de eventos de venda da Hotmart' })
  @ApiQuery({
    name: 'hottok',
    required: false,
    description: 'Token de verificação enviado automaticamente pela Hotmart',
  })
  @Post('webhook')
  receiveWebhook(
    @Body() payload: Record<string, unknown>,
    @Query('hottok') hottok?: string,
  ) {
    return this.hotmartService.receiveWebhook(payload, hottok);
  }

  // ── Endpoints protegidos — uso interno ───────────────────────────────────

  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Lista registros raw de vendas Hotmart' })
  @ApiQuery({ name: 'limit', required: false, description: 'Máximo de registros (default: 50)' })
  @Get('raw')
  listRaw(@Query('limit') limit?: string) {
    return this.hotmartService.listRaw(limit ? Number.parseInt(limit, 10) : 50);
  }

  @UseGuards(ApiKeyGuard)
  @ApiOperation({
    summary: 'Sincroniza vendas históricas da API Hotmart',
    description:
      'Requer HOTMART_CLIENT_ID e HOTMART_CLIENT_SECRET configurados no .env. ' +
      'Salva cada venda como raw com import_status=pending para processamento posterior.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Data inicial no formato ISO (ex.: 2024-01-01)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Data final no formato ISO (ex.: 2024-12-31)',
  })
  @ApiQuery({
    name: 'transactionStatus',
    required: false,
    description:
      'Status separados por vírgula. Se omitido retorna apenas APPROVED e COMPLETE. ' +
      'Ex.: APPROVED,CANCELLED,REFUNDED,COMPLETE,WAITING_PAYMENT,PRINTED_BILLET',
  })
  @Post('sync-history')
  syncHistory(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('transactionStatus') transactionStatus?: string,
  ) {
    return this.hotmartService.syncHistory({ startDate, endDate, transactionStatus });
  }
}
