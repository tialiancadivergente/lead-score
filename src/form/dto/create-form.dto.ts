import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFormDto {
  @ApiProperty({ example: 'O Resgate dos Otimistas' })
  name!: string;

  @ApiPropertyOptional({
    example: 'quiz',
  })
  type?: string;

  @ApiPropertyOptional({
    example: '4c88a392-6e6f-417e-822a-5be7221900fd',
  })
  launch_id?: string;

  @ApiPropertyOptional({
    example: 'b2aee9b9-bb96-4cd7-b7e4-5fde7ac352de',
  })
  season_id?: string;
}
