import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVotingCategoryDto {
  @ApiProperty({ example: 'financeira' })
  slug!: string;

  @ApiProperty({ example: 'Financeira' })
  name!: string;

  @ApiPropertyOptional({ example: 1 })
  display_order?: number;

  @ApiPropertyOptional({ example: true })
  active?: boolean;
}
