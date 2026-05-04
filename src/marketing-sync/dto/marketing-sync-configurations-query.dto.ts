import { ApiPropertyOptional } from '@nestjs/swagger';

export class MarketingSyncConfigurationsQueryDto {
  @ApiPropertyOptional({
    example: 'marketing_extract',
    description: 'Chave do sync configurado.',
  })
  syncKey?: string;

  @ApiPropertyOptional({
    example: 'meta_ads',
    description: 'Provider opcional associado a configuracao.',
  })
  provider?: string;
}
