import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListSeasonQueryDto {
  @ApiPropertyOptional({
    description: 'Filtro opcional por launch_id.',
    example: '4c88a392-6e6f-417e-822a-5be7221900fd',
  })
  launch_id?: string;
}
