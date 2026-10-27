import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSeasonDto {
  @ApiProperty({ example: 'Abr26' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Define se a season esta ativa. Padrao: true.',
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({ example: '4c88a392-6e6f-417e-822a-5be7221900fd' })
  @IsUUID()
  launch_id!: string;
}
