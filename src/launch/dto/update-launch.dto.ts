import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLaunchDto {
  @ApiPropertyOptional({ example: 'ORA 2026' })
  name?: string;

  @ApiPropertyOptional({ example: false })
  active?: boolean;
}
