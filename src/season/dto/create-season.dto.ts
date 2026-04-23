import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSeasonDto {
  @ApiProperty({ example: 'Abr26' })
  name!: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Define se a season esta ativa. Padrao: true.',
  })
  active?: boolean;

  @ApiProperty({ example: '4c88a392-6e6f-417e-822a-5be7221900fd' })
  launch_id!: string;
}
