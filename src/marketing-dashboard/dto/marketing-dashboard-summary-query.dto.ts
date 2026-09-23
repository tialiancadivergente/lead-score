import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class MarketingDashboardSummaryQueryDto {
  @ApiPropertyOptional({ example: 'meta_ads' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ example: '123456789' })
  @IsOptional()
  @IsString()
  externalAccountId?: string;

  @ApiPropertyOptional({ example: '987654321' })
  @IsOptional()
  @IsString()
  externalCampaignId?: string;

  @ApiPropertyOptional({ example: '555555' })
  @IsOptional()
  @IsString()
  externalAdsetId?: string;

  @ApiPropertyOptional({ example: '999999' })
  @IsOptional()
  @IsString()
  externalAdId?: string;

  @ApiPropertyOptional({
    example: '2026-04-01',
    description: 'Data inicial inclusiva no formato YYYY-MM-DD.',
  })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-04-16',
    description: 'Data final inclusiva no formato YYYY-MM-DD.',
  })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional({
    example: '12345678-1234-4567-890a-bcdef1234567',
  })
  @IsOptional()
  @IsString()
  launchId?: string;

  @ApiPropertyOptional({
    example: '12345678-1234-4567-890a-bcdef1234568',
  })
  @IsOptional()
  @IsString()
  seasonId?: string;
}
