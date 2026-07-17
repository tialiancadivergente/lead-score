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

  @ApiPropertyOptional({
    description:
      'Filtra campanhas cujo nome CONTÉM esse texto (case-insensitive). Reflete em tudo que é derivado de mídia (gasto, leads, vendas, etc), diferente de externalCampaignId que é match exato por id.',
    example: 'adv169',
  })
  campaignNameContains?: string;

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
