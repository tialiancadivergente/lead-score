import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListFormQueryDto {
  @ApiPropertyOptional({
    description: 'Filtro opcional por launch_id.',
    example: '4c88a392-6e6f-417e-822a-5be7221900fd',
  })
  launch_id?: string;

  @ApiPropertyOptional({
    description: 'Filtro opcional por season_id.',
    example: 'b2aee9b9-bb96-4cd7-b7e4-5fde7ac352de',
  })
  season_id?: string;

  @ApiPropertyOptional({
    description: 'Filtro opcional por type.',
    example: 'quiz',
  })
  type?: string;
}
