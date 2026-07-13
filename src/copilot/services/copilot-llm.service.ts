import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';
import { CopilotRiskSeverity } from '../../database/entities/copilot/copilot-risk-alert.entity';

export type RiskSignalInput = {
  launchName: string;
  ruleKey: string;
  metricLabel: string;
  currentValue: number | null;
  baselineValue: number | null;
  pctDiff: number | null;
  adName?: string | null;
  campaignName?: string | null;
  extraContext?: string | null;
};

export type RiskExplanation = {
  narrative: string;
  recommendation: string;
  severity: CopilotRiskSeverity;
};

export type LlmChatMessage = {
  role: 'assistant';
  content: string | null;
  toolCalls?: {
    id: string;
    name: string;
    arguments: string;
  }[];
};

const SYSTEM_PROMPT_BASE = `Você é um gestor de tráfego sênior da Aliança/OTG, analisando o desempenho de lançamentos digitais (funil: anúncio → lead → checkout → venda Hotmart).
Baseie toda afirmação numérica exclusivamente nos dados retornados pelas ferramentas (tools) — nunca invente números.
Ao apontar um problema, cite o nome do anúncio ou campanha específico quando disponível.
Seja direto e objetivo, em português do Brasil. Termine respostas de análise com uma recomendação de ação concreta.`;

@Injectable()
export class CopilotLlmService {
  private readonly logger = new Logger(CopilotLlmService.name);
  private client?: OpenAI;

  constructor(private readonly config: ConfigService) {}

  private getClient(): OpenAI {
    if (!this.client) {
      const apiKey = this.config.get<string>('OPENAI_API_KEY');
      if (!apiKey || apiKey === 'change-me') {
        throw new Error('OPENAI_API_KEY não configurada.');
      }
      this.client = new OpenAI({ apiKey });
    }
    return this.client;
  }

  private getModel(): string {
    return this.config.get<string>('OPENAI_MODEL', 'gpt-4o');
  }

  buildSystemPrompt(extraContext?: string | null): string {
    if (!extraContext) return SYSTEM_PROMPT_BASE;
    return `${SYSTEM_PROMPT_BASE}\n\nContexto adicional definido pelo gestor de tráfego para este lançamento (leve em consideração):\n${extraContext}`;
  }

  async explainRiskSignal(signal: RiskSignalInput): Promise<RiskExplanation> {
    const client = this.getClient();

    const userPrompt = [
      `Lançamento: ${signal.launchName}`,
      signal.adName ? `Anúncio: ${signal.adName}` : null,
      signal.campaignName ? `Campanha: ${signal.campaignName}` : null,
      `Regra disparada: ${signal.ruleKey}`,
      `Métrica: ${signal.metricLabel}`,
      `Valor atual: ${signal.currentValue ?? 'N/D'}`,
      `Valor de referência (baseline/meta): ${signal.baselineValue ?? 'N/D'}`,
      `Variação: ${signal.pctDiff !== null ? `${signal.pctDiff.toFixed(1)}%` : 'N/D'}`,
      '',
      'Explique em 1-2 frases a causa provável desse sinal (narrative), dê uma recomendação de ação concreta em 1 frase (recommendation), e classifique a severidade (severity: info, warning ou critical).',
      'Responda em JSON com as chaves: narrative, recommendation, severity.',
    ]
      .filter(Boolean)
      .join('\n');

    const response = await client.chat.completions.create({
      model: this.getModel(),
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: this.buildSystemPrompt(signal.extraContext),
        },
        { role: 'user', content: userPrompt },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? '{}';
    try {
      const parsed = JSON.parse(raw) as Partial<RiskExplanation>;
      const severity: CopilotRiskSeverity =
        parsed.severity === 'critical' || parsed.severity === 'warning'
          ? parsed.severity
          : 'info';
      return {
        narrative:
          parsed.narrative ?? 'Sinal detectado, sem explicação gerada.',
        recommendation: parsed.recommendation ?? 'Revisar manualmente.',
        severity,
      };
    } catch (err) {
      this.logger.error(`Falha ao parsear resposta da LLM: ${String(err)}`);
      return {
        narrative:
          'Sinal detectado, mas não foi possível gerar explicação automática.',
        recommendation: 'Revisar manualmente.',
        severity: 'info',
      };
    }
  }

  async complete(
    messages: ChatCompletionMessageParam[],
    tools?: ChatCompletionTool[],
  ): Promise<LlmChatMessage> {
    const client = this.getClient();

    const response = await client.chat.completions.create({
      model: this.getModel(),
      messages,
      tools: tools && tools.length > 0 ? tools : undefined,
    });

    const message = response.choices[0]?.message;
    return {
      role: 'assistant',
      content: message?.content ?? null,
      toolCalls: message?.tool_calls
        ?.filter((call) => call.type === 'function')
        .map((call) => ({
          id: call.id,
          name: call.function.name,
          arguments: call.function.arguments,
        })),
    };
  }
}
