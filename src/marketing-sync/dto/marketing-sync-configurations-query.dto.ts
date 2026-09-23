import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class MarketingSyncConfigurationsQueryDto {
  @ApiPropertyOptional({
    example: 'marketing_extract',
    description: 'Chave do sync configurado.',
  })
  @IsOptional()
  @IsString()
  syncKey?: string;

  @ApiPropertyOptional({
    example: 'meta_ads',
    description: 'Provider opcional associado a configuracao.',
  })
  @IsOptional()
  @IsString()
  provider?: string;
}
