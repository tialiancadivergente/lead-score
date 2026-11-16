import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ApiKeyOnly } from '../auth/decorators/api-key-only.decorator';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { HubspotLeadsResponseDto } from './dto/hubspot-leads-response.dto';
import { HubspotLeadsExAliadoResponseDto } from './dto/hubspot-leads-ex-aliado-response.dto';
import { ListHubspotLeadsQueryDto } from './dto/list-hubspot-leads-query.dto';
import { HubspotLeadEnrichmentService } from './hubspot-lead-enrichment.service';
import { HubspotService } from './hubspot.service';

@ApiTags('HubSpot')
@ApiSecurity('x-api-key')
@ApiKeyOnly()
@UseGuards(ApiKeyGuard)
@Controller('hubspot')
export class HubspotController {
  constructor(
    private readonly hubspotService: HubspotService,
    private readonly leadEnrichmentService: HubspotLeadEnrichmentService,
  ) {}

  @Get('leads/ally')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: 'Lista contatos do HubSpot com indicador ex_aliado',
    description:
      'Aceita os mesmos filtros, ordenacao e paginacao de GET /hubspot/leads. ' +
      'Acrescenta ex_aliado=true quando existe pedido com pedido_status 2 ou 241 ' +
      'e cliente.pessoa_email igual ao email do lead (ignora caixa e espacos nas pontas). ' +
      'Consulta o data lake em lote para os emails da pagina, em todo o historico de pedidos. ' +
      'Retorna todos os leads da pagina. Exige apenas x-api-key.',
  })
  @ApiResponse({ status: 200, type: HubspotLeadsExAliadoResponseDto })
  @ApiResponse({ status: 400, description: 'Parametros ou filtros invalidos.' })
  @ApiResponse({
    status: 401,
    description: 'Chave x-api-key ausente ou invalida.',
  })
  @ApiResponse({ status: 429, description: 'Limite de requisicoes atingido.' })
  @ApiResponse({
    status: 502,
    description: 'Falha na consulta ao HubSpot ou data lake.',
  })
  @ApiResponse({
    status: 503,
    description: 'Integracao nao configurada ou indisponivel.',
  })
  @ApiResponse({
    status: 504,
    description: 'Timeout na consulta ao HubSpot ou data lake.',
  })
  listLeadsWithExAliadoStatus(@Query() query: ListHubspotLeadsQueryDto) {
    return this.leadEnrichmentService.listLeads(query);
  }

  @Get('leads')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: 'Lista contatos do HubSpot sem persistir dados',
    description:
      'Consulta contacts diretamente, com sort_by=created_at|updated_at e order=asc|desc (padrao created_at desc). ' +
      'O periodo filtra a data de criacao, sem restringir lifecyclestage por padrao. ' +
      'Paginacao por cursor, ate 200 contatos por chamada e 10.000 por busca. ' +
      'Exige apenas x-api-key com INTERNAL_API_KEY, mesmo quando API_KEY_ENABLED=false.',
  })
  @ApiResponse({ status: 200, type: HubspotLeadsResponseDto })
  @ApiResponse({ status: 400, description: 'Parametros ou filtros invalidos.' })
  @ApiResponse({
    status: 401,
    description:
      'Chave x-api-key ausente, invalida ou nao configurada no servidor.',
  })
  @ApiResponse({ status: 429, description: 'Limite de requisicoes atingido.' })
  @ApiResponse({ status: 502, description: 'Falha na resposta do HubSpot.' })
  @ApiResponse({
    status: 503,
    description: 'HubSpot nao configurado ou indisponivel.',
  })
  @ApiResponse({
    status: 504,
    description: 'Tempo de consulta ao HubSpot excedido.',
  })
  listLeads(@Query() query: ListHubspotLeadsQueryDto) {
    return this.hubspotService.listLeads(query);
  }
}
