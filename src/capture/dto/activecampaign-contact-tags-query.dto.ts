import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type ActiveCampaignContactTagStatus =
  | 'success'
  | 'tag-not-found'
  | 'duplicate-tag'
  | 'missing-tag-id'
  | 'missing-contact-id'
  | 'skipped';

export class ActiveCampaignContactTagsQueryDto {
  @ApiProperty({
    description: 'Tag ID da capture.',
    example: '885678',
  })
  tag_id!: string;

  @ApiPropertyOptional({
    description:
      'Inicio do periodo de created_at (ISO 8601). Aceita data (YYYY-MM-DD) ou datetime.',
    example: '2026-07-01',
  })
  start_date?: string;

  @ApiPropertyOptional({
    description:
      'Fim do periodo de created_at (ISO 8601). Aceita data (YYYY-MM-DD) ou datetime.',
    example: '2026-07-30',
  })
  end_date?: string;

  @ApiPropertyOptional({
    description:
      'Filtra por status da associacao. success = contato com contactTag sem reason; skipped = qualquer reason.',
    enum: [
      'success',
      'tag-not-found',
      'duplicate-tag',
      'missing-tag-id',
      'missing-contact-id',
      'skipped',
    ],
    example: 'tag-not-found',
  })
  status?: ActiveCampaignContactTagStatus;

  @ApiPropertyOptional({
    description: 'Pagina atual (inicia em 1).',
    example: '1',
    default: '1',
  })
  page?: string;

  @ApiPropertyOptional({
    description: 'Quantidade de itens por pagina (padrao: 50, maximo: 200).',
    example: '50',
    default: '50',
  })
  per_page?: string;
}
