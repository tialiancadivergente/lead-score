import { ApiPropertyOptional } from '@nestjs/swagger';
import type { CopilotRiskSensitivity } from '../../database/entities/copilot/copilot-config.entity';

export class UpsertCopilotConfigDto {
  @ApiPropertyOptional({
    description: 'Sensibilidade das regras de risco',
    enum: ['low', 'medium', 'high'],
    example: 'medium',
  })
  riskSensitivity?: CopilotRiskSensitivity;

  @ApiPropertyOptional({
    description:
      'Regras de risco ativas (array de rule_key). Vazio/nulo = todas ativas.',
    example: ['CPL_SPIKE', 'ZERO_CONVERSION'],
  })
  enabledRules?: string[] | null;

  @ApiPropertyOptional({
    description:
      'Contexto livre injetado no prompt da IA (ex: sazonalidade, particularidades do publico).',
    example:
      'Ignore quedas de sabado/domingo, esse publico nao compra fim de semana.',
  })
  extraContext?: string | null;
}
