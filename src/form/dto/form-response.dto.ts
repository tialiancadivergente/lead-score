import { ApiProperty } from '@nestjs/swagger';

export class FormResponseDto {
  @ApiProperty({ example: '7405904f-64b9-4b2e-a067-a5fa246e1d55' })
  id!: string;

  @ApiProperty({ example: 'O Resgate dos Otimistas' })
  name!: string;

  @ApiProperty({ nullable: true, example: 'quiz' })
  type!: string | null;

  @ApiProperty({
    nullable: true,
    example: '4c88a392-6e6f-417e-822a-5be7221900fd',
  })
  launch_id!: string | null;

  @ApiProperty({
    nullable: true,
    example: 'b2aee9b9-bb96-4cd7-b7e4-5fde7ac352de',
  })
  season_id!: string | null;

  @ApiProperty({ example: '2026-03-01T00:00:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-03-20T12:30:00.000Z' })
  updated_at!: string;
}
