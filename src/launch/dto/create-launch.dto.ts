import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLaunchDto {
  @ApiProperty({ example: 'ORA' })
  name!: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Define se o launch esta ativo. Padrao: true.',
  })
  active?: boolean;
}
