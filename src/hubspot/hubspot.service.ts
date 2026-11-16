import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isISO8601 } from 'class-validator';
import {
  HubspotLeadDto,
  HubspotLeadsResponseDto,
} from './dto/hubspot-leads-response.dto';
import { ListHubspotLeadsQueryDto } from './dto/list-hubspot-leads-query.dto';

const SEARCH_LIMIT = 10_000;
const CONTACT_PROPERTIES = [
  'firstname',
  'lastname',
  'email',
  'phone',
  'mobilephone',
  'company',
  'lifecyclestage',
  'hs_lead_status',
  'hubspot_owner_id',
  'hs_analytics_source',
  'createdate',
  'lastmodifieddate',
];

type ContactRecord = {
  id: string;
  properties: Record<string, string | null>;
  createdAt?: string;
  updatedAt?: string;
};

type SearchResponse = {
  total: number;
  results: ContactRecord[];
  paging?: { next?: { after?: string | number } };
};

type SearchFilter = {
  propertyName: string;
  operator: 'EQ' | 'GTE' | 'LTE';
  value: string;
};

@Injectable()
export class HubspotService {
  constructor(private readonly config: ConfigService) {}

  async listLeads(
    query: ListHubspotLeadsQueryDto,
  ): Promise<HubspotLeadsResponseDto> {
    const filters = this.buildFilters(query);
    const after = query.after ?? 0;
    const limit = Math.min(query.limit ?? 50, SEARCH_LIMIT - after);
    const body = {
      properties: CONTACT_PROPERTIES,
      sorts: [
        {
          propertyName:
            query.sort_by === 'updated_at' ? 'lastmodifieddate' : 'createdate',
          direction: query.order === 'asc' ? 'ASCENDING' : 'DESCENDING',
        },
      ],
      limit,
      ...(query.after !== undefined ? { after } : {}),
      ...(filters.length ? { filterGroups: [{ filters }] } : {}),
      ...(query.q ? { query: query.q } : {}),
    };
    const data = await this.searchContacts(body);
    const rawNext = data.paging?.next?.after;
    const next = rawNext === undefined ? null : Number(rawNext);
    const nextAfter =
      next !== null &&
      Number.isInteger(next) &&
      next > after &&
      next < SEARCH_LIMIT
        ? String(next)
        : null;

    return {
      items: data.results.map((contact) => this.mapContact(contact)),
      meta: {
        total_items: data.total,
        limit,
        next_after: nextAfter,
        has_more: nextAfter !== null,
        results_limited: data.total > SEARCH_LIMIT,
      },
    };
  }

  private buildFilters(query: ListHubspotLeadsQueryDto): SearchFilter[] {
    const start = this.parseDateBoundary(query.start_date, false);
    const end = this.parseDateBoundary(query.end_date, true);
    if (start !== undefined && end !== undefined && start > end) {
      throw new BadRequestException(
        'start_date deve ser menor ou igual a end_date.',
      );
    }

    const filters: SearchFilter[] = [];
    if (start !== undefined) {
      filters.push({
        propertyName: 'createdate',
        operator: 'GTE',
        value: String(start),
      });
    }
    if (end !== undefined) {
      filters.push({
        propertyName: 'createdate',
        operator: 'LTE',
        value: String(end),
      });
    }
    for (const propertyName of [
      'lifecyclestage',
      'hs_lead_status',
      'email',
    ] as const) {
      const value = query[propertyName];
      if (value) {
        filters.push({ propertyName, operator: 'EQ', value });
      }
    }
    return filters;
  }

  private parseDateBoundary(value: string | undefined, isEnd: boolean) {
    if (value === undefined) return undefined;
    if (!isISO8601(value, { strict: true })) {
      throw new BadRequestException('Data invalida. Use ISO 8601.');
    }
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const normalized = dateOnly
      ? `${value}T${isEnd ? '23:59:59.999' : '00:00:00.000'}Z`
      : value;
    return new Date(normalized).getTime();
  }

  private async searchContacts(body: object): Promise<SearchResponse> {
    const token = this.config.get<string>('HUBSPOT_ACCESS_TOKEN')?.trim();
    if (!token) {
      throw new ServiceUnavailableException(
        'HubSpot nao configurado. Defina HUBSPOT_ACCESS_TOKEN no backend.',
      );
    }
    const baseUrl =
      this.config.get<string>('HUBSPOT_BASE_URL')?.trim() ||
      'https://api.hubapi.com';
    let url: URL;
    try {
      url = new URL(baseUrl);
      if (url.protocol !== 'https:' || url.username || url.password)
        throw new Error();
      url = new URL('/crm/v3/objects/contacts/search', url);
    } catch {
      throw new ServiceUnavailableException(
        'HUBSPOT_BASE_URL invalida. Use uma URL HTTPS.',
      );
    }
    const timeout = Number(
      this.config.get<string>('HUBSPOT_REQUEST_TIMEOUT_MS', '10000'),
    );
    if (!Number.isInteger(timeout) || timeout < 1 || timeout > 60000) {
      throw new ServiceUnavailableException(
        'HUBSPOT_REQUEST_TIMEOUT_MS deve estar entre 1 e 60000.',
      );
    }
    const signal = AbortSignal.timeout(timeout);
    try {
      // POST /search e uma consulta de leitura; nao cria ou altera contatos.
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal,
        redirect: 'error',
      });
      if (!response.ok) this.throwUpstreamError(response.status);
      const data: unknown = await response.json();
      if (!this.isSearchResponse(data)) {
        throw new BadGatewayException('Resposta invalida do HubSpot.');
      }
      return data;
    } catch (error) {
      if (signal.aborted) {
        throw new GatewayTimeoutException(
          'Tempo de consulta ao HubSpot excedido.',
        );
      }
      if (error instanceof HttpException) throw error;
      // Nao repassa corpo de erro, token ou dados pessoais retornados pelo provedor.
      throw new BadGatewayException('Nao foi possivel consultar o HubSpot.');
    }
  }

  private throwUpstreamError(status: number): never {
    if (status === 429) {
      throw new HttpException(
        'Limite de consultas ao HubSpot atingido. Tente novamente em alguns segundos.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (status === 401 || status === 403) {
      throw new BadGatewayException(
        'Acesso ao HubSpot recusado. Verifique o token e a permissao crm.objects.contacts.read no backend.',
      );
    }
    if (status === 400) {
      throw new BadRequestException(
        'HubSpot recusou os filtros. Verifique os valores internos de estagio/status e restrinja o periodo.',
      );
    }
    if (status >= 500) {
      throw new ServiceUnavailableException(
        'HubSpot temporariamente indisponivel.',
      );
    }
    throw new BadGatewayException('Falha ao consultar contatos no HubSpot.');
  }

  private isSearchResponse(value: unknown): value is SearchResponse {
    if (!value || typeof value !== 'object') return false;
    const data = value as Partial<SearchResponse>;
    return (
      Number.isInteger(data.total) &&
      Number(data.total) >= 0 &&
      Array.isArray(data.results) &&
      data.results.every(
        (contact) =>
          contact &&
          typeof contact.id === 'string' &&
          contact.properties &&
          typeof contact.properties === 'object' &&
          !Array.isArray(contact.properties) &&
          Object.values(contact.properties).every(
            (property) => property === null || typeof property === 'string',
          ),
      )
    );
  }

  private mapContact(contact: ContactRecord): HubspotLeadDto {
    const p = contact.properties;
    const firstname = p.firstname?.trim() || null;
    const lastname = p.lastname?.trim() || null;
    return {
      id: contact.id,
      name: [firstname, lastname].filter(Boolean).join(' ') || null,
      firstname,
      lastname,
      email: p.email || null,
      phone: p.phone || null,
      mobilephone: p.mobilephone || null,
      company: p.company || null,
      lifecyclestage: p.lifecyclestage || null,
      hs_lead_status: p.hs_lead_status || null,
      hubspot_owner_id: p.hubspot_owner_id || null,
      hs_analytics_source: p.hs_analytics_source || null,
      created_at: p.createdate || contact.createdAt || null,
      updated_at: p.lastmodifieddate || contact.updatedAt || null,
    };
  }
}
