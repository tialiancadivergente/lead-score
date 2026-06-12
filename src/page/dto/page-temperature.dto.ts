import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePageTemperatureDto {
  @ApiProperty({ example: '4c88a392-6e6f-417e-822a-5be7221900fd' })
  temperature_id!: string;

  @ApiProperty({ example: 'TAG_QUENTE_001' })
  tag_id!: string;

  @ApiProperty({ example: 'https://example.com/quente' })
  redirect_url!: string;

  @ApiPropertyOptional({ example: true })
  active?: boolean;
}

export class UpdatePageTemperatureDto {
  @ApiPropertyOptional({ example: 'TAG_QUENTE_002' })
  tag_id?: string;

  @ApiPropertyOptional({ example: 'https://example.com/quente-v2' })
  redirect_url?: string;

  @ApiPropertyOptional({ example: true })
  active?: boolean;
}

export class PageTemperatureResponseDto {
  @ApiProperty({ example: '7405904f-64b9-4b2e-a067-a5fa246e1d55' })
  id!: string;

  @ApiProperty({ example: '4c88a392-6e6f-417e-822a-5be7221900fd' })
  temperature_id!: string;

  @ApiProperty({ nullable: true, example: 'hot' })
  temperature_abbreviation!: string | null;

  @ApiProperty({ nullable: true, example: 'Quente' })
  temperature_name!: string | null;

  @ApiProperty({ example: 'TAG_QUENTE_001' })
  tag_id!: string;

  @ApiProperty({ example: 'https://example.com/quente' })
  redirect_url!: string;

  @ApiProperty({ example: true })
  active!: boolean;

  @ApiProperty({ example: '2026-06-10T12:00:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-06-10T12:00:00.000Z' })
  updated_at!: string;
}
