import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateLaunchDto {
  @ApiProperty({ example: 'ORA' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Define se o launch esta ativo. Padrao: true.',
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
