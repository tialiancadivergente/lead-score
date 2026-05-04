import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertMarketingSyncConfigurationDto {
  @ApiProperty({
    example: 'marketing_extract',
    description: 'Chave do sync configurado.',
  })
  syncKey!: string;

  @ApiPropertyOptional({
    example: 'meta_ads',
    description: 'Provider opcional associado a configuracao.',
  })
  provider?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Liga ou desliga o sync.',
  })
  enabled?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Liga ou desliga o scheduler deste sync.',
  })
  scheduleEnabled?: boolean;

  @ApiPropertyOptional({
    example: 60,
    description: 'Intervalo do scheduler em minutos.',
  })
  scheduleIntervalMinutes?: number | null;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Config JSON livre para este sync.',
  })
  config?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Metadata livre de apoio operacional.',
  })
  metadata?: Record<string, unknown> | null;
}
