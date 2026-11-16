import { Injectable } from '@nestjs/common';
import { PedidosService } from '../pedidos/pedidos.service';
import { HubspotLeadsExAliadoResponseDto } from './dto/hubspot-leads-ex-aliado-response.dto';
import { ListHubspotLeadsQueryDto } from './dto/list-hubspot-leads-query.dto';
import { HubspotService } from './hubspot.service';

@Injectable()
export class HubspotLeadEnrichmentService {
  constructor(
    private readonly hubspotService: HubspotService,
    private readonly pedidosService: PedidosService,
  ) {}

  async listLeads(
    query: ListHubspotLeadsQueryDto,
  ): Promise<HubspotLeadsExAliadoResponseDto> {
    const leads = await this.hubspotService.listLeads(query);
    const exAliadoEmails = await this.pedidosService.findExAliadoEmails(
      leads.items.map((lead) => lead.email),
    );
    return {
      ...leads,
      items: leads.items.map((lead) => ({
        ...lead,
        ex_aliado: exAliadoEmails.has(lead.email?.trim().toLowerCase() ?? ''),
      })),
    };
  }
}
