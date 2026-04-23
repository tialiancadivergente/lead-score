import { ApiPropertyOptional } from '@nestjs/swagger';

export class CaptureFilterQueryDto {
  @ApiPropertyOptional({
    description:
      'Inicio do periodo de created_at (ISO 8601). Aceita data (YYYY-MM-DD) ou datetime.',
    example: '2026-02-01',
  })
  start_date?: string;

  @ApiPropertyOptional({
    description:
      'Fim do periodo de created_at (ISO 8601). Aceita data (YYYY-MM-DD) ou datetime.',
    example: '2026-02-29',
  })
  end_date?: string;

  @ApiPropertyOptional({
    description: 'Filtro por launch_id.',
    example: '0b2f5687-2cdf-4d95-81f9-7e97d6f0d6d2',
  })
  launch_id?: string;

  @ApiPropertyOptional({
    description: 'Filtro por temperature_id.',
    example: '7b489f3a-e045-4b4e-857f-32544057c9ac',
  })
  temperature_id?: string;

  @ApiPropertyOptional({
    description: 'Filtro por season_id.',
    example: 'f70d2c2f-31cb-4d66-8321-a18aa9f19e18',
  })
  season_id?: string;

  @ApiPropertyOptional({
    description:
      'Filtra por resposta de quiz: true (respondeu) ou false (não respondeu).',
    example: 'true',
  })
  quiz_answered?: string;
}
