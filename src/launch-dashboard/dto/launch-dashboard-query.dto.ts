import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LaunchDashboardQueryDto {
  @ApiPropertyOptional({ example: '12345678-0000-0000-0000-000000000001' })
  @IsOptional()
  @IsString()
  launchId?: string;

  @ApiPropertyOptional({ example: '12345678-0000-0000-0000-000000000002' })
  @IsOptional()
  @IsString()
  seasonId?: string;

  @ApiPropertyOptional({ example: '2026-04-01' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-04-30' })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalCampaignId?: string;

  @ApiPropertyOptional({
    description:
      'Filtra campanhas cujo nome CONTÉM esse texto (case-insensitive). Reflete em tudo que é derivado de mídia (gasto, leads, vendas, etc), diferente de externalCampaignId que é match exato por id.',
    example: 'adv169',
  })
  @IsOptional()
  @IsString()
  campaignNameContains?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalAdsetId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalAdId?: string;

  @ApiPropertyOptional({
    description:
      'Agrupamento da tabela de funil: "ad" (por external_ad_id, default) ou "adName" (consolida todos os anúncios com o mesmo nome/nomenclatura)',
    enum: ['ad', 'adName'],
    example: 'adName',
  })
  @IsOptional()
  @IsString()
  groupBy?: 'ad' | 'adName';
}
