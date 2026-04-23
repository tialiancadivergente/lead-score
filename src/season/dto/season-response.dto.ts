import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SeasonResponseDto {
  @ApiProperty({ example: '4c88a392-6e6f-417e-822a-5be7221900fd' })
  id!: string;

  @ApiProperty({ example: 'Abr26' })
  name!: string;

  @ApiProperty({ example: true })
  active!: boolean;

  @ApiPropertyOptional({
    nullable: true,
    example: 'b2aee9b9-bb96-4cd7-b7e4-5fde7ac352de',
  })
  launch_id!: string | null;

  @ApiProperty({ example: '2026-03-01T00:00:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-03-20T12:30:00.000Z' })
  updated_at!: string;
}
