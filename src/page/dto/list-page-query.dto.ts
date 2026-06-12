import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListPageQueryDto {
  @ApiPropertyOptional({ example: '4c88a392-6e6f-417e-822a-5be7221900fd' })
  launch_id?: string;

  @ApiPropertyOptional({ example: 'b2aee9b9-bb96-4cd7-b7e4-5fde7ac352de' })
  season_id?: string;

  @ApiPropertyOptional({ example: '7405904f-64b9-4b2e-a067-a5fa246e1d55' })
  form_id?: string;

  @ApiPropertyOptional({ example: 'p1' })
  abbreviation?: string;

  @ApiPropertyOptional({ example: 'true' })
  active?: string;
}
