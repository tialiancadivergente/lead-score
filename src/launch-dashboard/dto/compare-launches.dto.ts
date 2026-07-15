import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompareLaunchItemDto {
  @ApiProperty({ example: '12345678-0000-0000-0000-000000000001' })
  launchId!: string;

  @ApiProperty({ example: '2026-04-01' })
  dateFrom!: string;

  @ApiProperty({ example: '2026-04-30' })
  dateTo!: string;

  @ApiPropertyOptional({ example: 'ORO Jun26' })
  label?: string;
}

export class CompareLaunchesDto {
  @ApiProperty({ type: CompareLaunchItemDto, isArray: true })
  launches!: CompareLaunchItemDto[];
}
