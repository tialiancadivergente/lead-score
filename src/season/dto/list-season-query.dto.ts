import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ListSeasonQueryDto {
  @ApiPropertyOptional({
    description: 'Filtro opcional por launch_id.',
    example: '4c88a392-6e6f-417e-822a-5be7221900fd',
  })
  @IsOptional()
  @IsString()
  launch_id?: string;
}
