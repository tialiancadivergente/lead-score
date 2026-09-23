import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

export class CompareLaunchItemDto {
  @ApiProperty({ example: '12345678-0000-0000-0000-000000000001' })
  @IsString()
  launchId!: string;

  @ApiProperty({ example: '2026-04-01' })
  @IsString()
  dateFrom!: string;

  @ApiProperty({ example: '2026-04-30' })
  @IsString()
  dateTo!: string;

  @ApiPropertyOptional({ example: 'ORO Jun26' })
  @IsOptional()
  @IsString()
  label?: string;
}

export class CompareLaunchesDto {
  @ApiProperty({ type: CompareLaunchItemDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompareLaunchItemDto)
  launches!: CompareLaunchItemDto[];
}
