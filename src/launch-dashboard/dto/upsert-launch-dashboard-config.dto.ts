import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertLaunchDashboardConfigDto {
  // ─── Metas numéricas ──────────────────────────────────────────────────────

  @ApiPropertyOptional({ description: 'Meta de investimento total (R$)', example: 100000 })
  targetSpend?: number;

  @ApiPropertyOptional({ description: 'Meta de cadastros gerados', example: 15000 })
  targetLeads?: number;

  @ApiPropertyOptional({ description: 'Meta de custo por lead (R$)', example: 6.40 })
  targetCpl?: number;

  @ApiPropertyOptional({ description: 'Meta de connect rate (0 a 1)', example: 0.75 })
  targetConnectRate?: number;

  @ApiPropertyOptional({ description: 'Meta de conversão de páginas / Tx PgV→Checkout (0 a 1)', example: 0.10 })
  targetPageConversion?: number;

  @ApiPropertyOptional({ description: 'Meta de CPC (R$)', example: 3.00 })
  targetCpc?: number;

  @ApiPropertyOptional({ description: 'Meta de CPM (R$)', example: 50.00 })
  targetCpm?: number;

  @ApiPropertyOptional({ description: 'Meta de CTR (0 a 1)', example: 0.02 })
  targetCtr?: number;

  @ApiPropertyOptional({ description: 'Meta de taxa de resposta à pesquisa (0 a 1)', example: 0.20 })
  targetSurveyResponseRate?: number;

  @ApiPropertyOptional({ description: 'Meta de taxa de consciência (0 a 1)', example: 0.30 })
  targetConsciousnessRate?: number;

  @ApiPropertyOptional({ description: 'Meta de taxa "conhece Elton" (0 a 1)', example: 0.25 })
  targetKnowsEltonRate?: number;

  @ApiPropertyOptional({ description: 'Meta de taxa "conhece Aliança" (0 a 1)', example: 0.25 })
  targetKnowsAllianceRate?: number;

  // ─── Question keys para consciência ──────────────────────────────────────

  @ApiPropertyOptional({ description: 'question_key da pergunta de consciência geral' })
  questionKeyConsciousness?: string;

  @ApiPropertyOptional({ description: 'option_key da opção positiva para consciência' })
  positiveOptionKeyConsciousness?: string;

  @ApiPropertyOptional({ description: 'question_key da pergunta "conhece o Elton?"' })
  questionKeyKnowsElton?: string;

  @ApiPropertyOptional({ description: 'option_key da opção positiva para "conhece Elton"' })
  positiveOptionKeyKnowsElton?: string;

  @ApiPropertyOptional({ description: 'question_key da pergunta "conhece a Aliança?"' })
  questionKeyKnowsAlliance?: string;

  @ApiPropertyOptional({ description: 'option_key da opção positiva para "conhece Aliança"' })
  positiveOptionKeyKnowsAlliance?: string;
}
