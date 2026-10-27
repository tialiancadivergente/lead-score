import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateSeasonDto {
  @ApiPropertyOptional({ example: 'Abr26 Fase 2' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ example: '4c88a392-6e6f-417e-822a-5be7221900fd' })
  @IsOptional()
  @IsUUID()
  launch_id?: string;
}
