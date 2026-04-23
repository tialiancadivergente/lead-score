import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVotingCategoryDto {
  @ApiPropertyOptional({ example: 'financeira' })
  slug?: string;

  @ApiPropertyOptional({ example: 'Financeira' })
  name?: string;

  @ApiPropertyOptional({ example: 1 })
  display_order?: number;

  @ApiPropertyOptional({ example: true })
  active?: boolean;
}
