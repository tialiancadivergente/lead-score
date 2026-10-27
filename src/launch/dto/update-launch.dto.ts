import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateLaunchDto {
  @ApiPropertyOptional({ example: 'ORA 2026' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
