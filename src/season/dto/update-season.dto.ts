import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSeasonDto {
  @ApiPropertyOptional({ example: 'Abr26 Fase 2' })
  name?: string;

  @ApiPropertyOptional({ example: false })
  active?: boolean;

  @ApiPropertyOptional({ example: '4c88a392-6e6f-417e-822a-5be7221900fd' })
  launch_id?: string;
}
