import { ApiPropertyOptional } from '@nestjs/swagger';

export class MarketingDashboardSummaryQueryDto {
  @ApiPropertyOptional({ example: 'meta_ads' })
  provider?: string;

  @ApiPropertyOptional({ example: '123456789' })
  externalAccountId?: string;

  @ApiPropertyOptional({ example: '987654321' })
  externalCampaignId?: string;

  @ApiPropertyOptional({ example: '555555' })
  externalAdsetId?: string;

  @ApiPropertyOptional({ example: '999999' })
  externalAdId?: string;

  @ApiPropertyOptional({
    example: '2026-04-01',
    description: 'Data inicial inclusiva no formato YYYY-MM-DD.',
  })
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-04-16',
    description: 'Data final inclusiva no formato YYYY-MM-DD.',
  })
  dateTo?: string;

  @ApiPropertyOptional({
    example: '12345678-1234-4567-890a-bcdef1234567',
  })
  launchId?: string;

  @ApiPropertyOptional({
    example: '12345678-1234-4567-890a-bcdef1234568',
  })
  seasonId?: string;
}
