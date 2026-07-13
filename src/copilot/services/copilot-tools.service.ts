import { Injectable, Logger } from '@nestjs/common';
import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import { LaunchDashboardService } from '../../launch-dashboard/launch-dashboard.service';
import { LaunchDashboardQueryDto } from '../../launch-dashboard/dto/launch-dashboard-query.dto';
import { CopilotRiskAlertsService } from './copilot-risk-alerts.service';

const DATE_RANGE_PROPERTIES = {
  dateFrom: { type: 'string', description: 'Data inicial YYYY-MM-DD' },
  dateTo: { type: 'string', description: 'Data final YYYY-MM-DD' },
  externalAccountId: {
    type: 'string',
    description: 'Filtro opcional por conta de anúncio',
  },
  externalCampaignId: {
    type: 'string',
    description: 'Filtro opcional por campanha',
  },
  externalAdsetId: {
    type: 'string',
    description: 'Filtro opcional por conjunto de anúncios',
  },
  externalAdId: {
    type: 'string',
    description: 'Filtro opcional por anúncio específico',
  },
} as const;

// Cada tool é um wrapper 1:1 de um método já existente em LaunchDashboardService
// — a IA sempre vê exatamente os mesmos números renderizados no dashboard.
export const COPILOT_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_summary',
      description:
        'KPIs agregados do funil (gasto, leads, connect rate, vendas, CPL, CPA, etc) no período.',
      parameters: {
        type: 'object',
        properties: { ...DATE_RANGE_PROPERTIES },
        required: ['dateFrom', 'dateTo'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_funnel_table',
      description:
        'Tabela de desempenho por anúncio (spend, ctr, cpc, cpm, connect rate, leads, vendas, receita) — use para achar o anúncio específico com problema ou o melhor anúncio.',
      parameters: {
        type: 'object',
        properties: { ...DATE_RANGE_PROPERTIES },
        required: ['dateFrom', 'dateTo'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_timeseries',
      description:
        'Série diária de spend/impressions/clicks/leads/sales/ctr/cpl no período — use para ver tendência dia a dia.',
      parameters: {
        type: 'object',
        properties: {
          dateFrom: DATE_RANGE_PROPERTIES.dateFrom,
          dateTo: DATE_RANGE_PROPERTIES.dateTo,
        },
        required: ['dateFrom', 'dateTo'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_tier_distribution',
      description:
        'Distribuição de leads por faixa de leadscore (A+ a E) no período.',
      parameters: {
        type: 'object',
        properties: {
          dateFrom: DATE_RANGE_PROPERTIES.dateFrom,
          dateTo: DATE_RANGE_PROPERTIES.dateTo,
        },
        required: ['dateFrom', 'dateTo'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_awareness_metrics',
      description:
        'Métricas de consciência/engajamento com a pesquisa (taxa de resposta, conhece especialista, conhece Aliança) no período.',
      parameters: {
        type: 'object',
        properties: {
          dateFrom: DATE_RANGE_PROPERTIES.dateFrom,
          dateTo: DATE_RANGE_PROPERTIES.dateTo,
        },
        required: ['dateFrom', 'dateTo'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_launch_config',
      description:
        'Metas configuradas para o lançamento (CPL alvo, spend alvo, CTR alvo, etc) — use para saber o que é "bom" ou "ruim".',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_open_risk_alerts',
      description:
        'Alertas de risco abertos já detectados automaticamente para este lançamento.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

@Injectable()
export class CopilotToolsService {
  private readonly logger = new Logger(CopilotToolsService.name);

  constructor(
    private readonly dashboardService: LaunchDashboardService,
    private readonly riskAlertsService: CopilotRiskAlertsService,
  ) {}

  async dispatch(
    name: string,
    argsJson: string,
    launchId: string,
  ): Promise<unknown> {
    let args: Record<string, unknown> = {};
    try {
      args = argsJson ? JSON.parse(argsJson) : {};
    } catch (_err) {
      this.logger.warn(`Argumentos inválidos para tool ${name}: ${argsJson}`);
    }

    const query: LaunchDashboardQueryDto = {
      launchId,
      dateFrom: typeof args.dateFrom === 'string' ? args.dateFrom : undefined,
      dateTo: typeof args.dateTo === 'string' ? args.dateTo : undefined,
      externalAccountId:
        typeof args.externalAccountId === 'string'
          ? args.externalAccountId
          : undefined,
      externalCampaignId:
        typeof args.externalCampaignId === 'string'
          ? args.externalCampaignId
          : undefined,
      externalAdsetId:
        typeof args.externalAdsetId === 'string'
          ? args.externalAdsetId
          : undefined,
      externalAdId:
        typeof args.externalAdId === 'string' ? args.externalAdId : undefined,
    };

    switch (name) {
      case 'get_summary':
        return this.dashboardService.getSummary(query);
      case 'get_funnel_table':
        return this.dashboardService.getFunnelTable(query);
      case 'get_timeseries':
        return this.dashboardService.getTimeseries(query);
      case 'get_tier_distribution':
        return this.dashboardService.getTierDistribution(query);
      case 'get_awareness_metrics':
        return this.dashboardService.getAwarenessMetrics(query);
      case 'get_launch_config':
        return this.dashboardService.getConfig(launchId);
      case 'get_open_risk_alerts':
        return this.riskAlertsService.list(launchId, 'open');
      default:
        return { error: `Tool desconhecida: ${name}` };
    }
  }
}
