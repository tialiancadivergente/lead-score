import { ApiProperty } from '@nestjs/swagger';

export class LaunchResponseDto {
  @ApiProperty({ example: '4c88a392-6e6f-417e-822a-5be7221900fd' })
  id!: string;

  @ApiProperty({ example: 'ORA' })
  name!: string;

  @ApiProperty({ example: true })
  active!: boolean;

  @ApiProperty({ example: '2026-03-01T00:00:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-03-20T12:30:00.000Z' })
  updated_at!: string;
}
