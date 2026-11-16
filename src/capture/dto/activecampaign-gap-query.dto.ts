import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ActiveCampaignGapQueryDto {
  @ApiProperty({
    description: 'Tag ID da capture.',
    example: '120246',
  })
  @IsString()
  tag_id!: string;

  @ApiPropertyOptional({
    description:
      'Inicio do periodo de created_at (ISO 8601). Aceita data (YYYY-MM-DD) ou datetime.',
    example: '2026-07-01',
  })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiPropertyOptional({
    description:
      'Fim do periodo de created_at (ISO 8601). Aceita data (YYYY-MM-DD) ou datetime.',
    example: '2026-07-25',
  })
  @IsOptional()
  @IsString()
  end_date?: string;
}
