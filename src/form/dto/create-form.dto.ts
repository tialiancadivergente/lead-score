import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateFormDto {
  @ApiProperty({ example: 'O Resgate dos Otimistas' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    example: 'quiz',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    example: '4c88a392-6e6f-417e-822a-5be7221900fd',
  })
  @IsOptional()
  @IsUUID()
  launch_id?: string;

  @ApiPropertyOptional({
    example: 'b2aee9b9-bb96-4cd7-b7e4-5fde7ac352de',
  })
  @IsOptional()
  @IsUUID()
  season_id?: string;
}
