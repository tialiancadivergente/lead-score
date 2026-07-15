import { ApiPropertyOptional } from '@nestjs/swagger';

export class LaunchDashboardQueryDto {
  @ApiPropertyOptional({ example: '12345678-0000-0000-0000-000000000001' })
  launchId?: string;

  @ApiPropertyOptional({ example: '12345678-0000-0000-0000-000000000002' })
  seasonId?: string;

  @ApiPropertyOptional({ example: '2026-04-01' })
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-04-30' })
  dateTo?: string;

  @ApiPropertyOptional()
  externalAccountId?: string;

  @ApiPropertyOptional()
  externalCampaignId?: string;

  @ApiPropertyOptional()
  externalAdsetId?: string;

  @ApiPropertyOptional()
  externalAdId?: string;

  @ApiPropertyOptional({
    description:
      'Agrupamento da tabela de funil: "ad" (por external_ad_id, default) ou "adName" (consolida todos os anúncios com o mesmo nome/nomenclatura)',
    enum: ['ad', 'adName'],
    example: 'adName',
  })
  groupBy?: 'ad' | 'adName';
}
