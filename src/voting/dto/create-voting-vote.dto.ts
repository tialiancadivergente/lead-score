import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVotingVoteDto {
  @ApiProperty({ example: 'premio-2026' })
  campaign_slug!: string;

  @ApiProperty({ example: 'dcfcda4d-17ea-43d2-961b-930cb9929228' })
  candidate_id!: string;

  @ApiProperty({ example: 'Maria de Souza' })
  name!: string;

  @ApiProperty({ example: 'maria@email.com' })
  email!: string;

  @ApiProperty({ example: '+5511999999999' })
  phone!: string;

  @ApiPropertyOptional({
    description: 'Dados auxiliares opcionais enviados pelo frontend.',
    example: { referrer: 'https://site.com/campanha', source: 'landing-page' },
  })
  metadata?: Record<string, unknown>;
}
