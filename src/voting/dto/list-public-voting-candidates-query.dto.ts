import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListPublicVotingCandidatesQueryDto {
  @ApiPropertyOptional({ example: 'financeira' })
  category_slug?: string;

  @ApiPropertyOptional({
    example: 'fernanda',
    description: 'Busca por nome do candidato.',
  })
  search?: string;
}
