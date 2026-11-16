import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ApiKeyOnly } from '../auth/decorators/api-key-only.decorator';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { ListPedidosQueryDto } from './dto/list-pedidos-query.dto';
import { PedidosService } from './pedidos.service';

@ApiTags('Pedidos')
@ApiSecurity('x-api-key')
@ApiKeyOnly()
@UseGuards(ApiKeyGuard)
@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Lista pedidos e clientes diretamente do data lake',
    description:
      'Preserva o contrato do api-backoffice: todas as colunas dos pedidos, cliente completo ou null, data, pagination e consultadoEm. Ordena por criado DESC e id DESC. Exige apenas x-api-key.',
  })
  @ApiResponse({
    status: 200,
    description: 'Pagina de pedidos, total e instante da consulta.',
    schema: {
      type: 'object',
      required: ['data', 'pagination', 'consultadoEm'],
      properties: {
        data: {
          type: 'array',
          items: { type: 'object', additionalProperties: true },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
            hasNext: { type: 'boolean' },
          },
        },
        consultadoEm: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Paginacao invalida.' })
  @ApiResponse({
    status: 401,
    description: 'Chave x-api-key ausente ou invalida.',
  })
  @ApiResponse({ status: 502, description: 'Falha ao consultar o Databricks.' })
  @ApiResponse({ status: 503, description: 'Databricks nao configurado.' })
  @ApiResponse({
    status: 504,
    description: 'Timeout ao consultar o Databricks.',
  })
  listar(@Query() query: ListPedidosQueryDto) {
    return this.pedidosService.listar(query.page, query.limit);
  }
}
