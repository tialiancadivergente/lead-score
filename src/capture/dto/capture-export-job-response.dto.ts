import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CaptureExportJobResponseDto {
  @ApiProperty({ example: '0b2f5687-2cdf-4d95-81f9-7e97d6f0d6d2' })
  id!: string;

  @ApiProperty({ enum: ['csv', 'xlsx'], example: 'csv' })
  format!: 'csv' | 'xlsx';

  @ApiProperty({
    enum: ['pending', 'processing', 'completed', 'failed'],
    example: 'processing',
  })
  status!: 'pending' | 'processing' | 'completed' | 'failed';

  @ApiPropertyOptional({ example: 15320, nullable: true })
  total_items!: number | null;

  @ApiProperty({ example: 4000 })
  processed_items!: number;

  @ApiProperty({
    example: 26,
    description:
      'Percentual concluido (0-100). Fica em 0 enquanto total_items ainda nao foi calculado.',
  })
  percent!: number;

  @ApiPropertyOptional({ nullable: true })
  error_message!: string | null;

  @ApiProperty({ example: '2026-07-17T12:00:00.000Z' })
  created_at!: string;

  @ApiPropertyOptional({ nullable: true })
  started_at!: string | null;

  @ApiPropertyOptional({ nullable: true })
  completed_at!: string | null;
}
