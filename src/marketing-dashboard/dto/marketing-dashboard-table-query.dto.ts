import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { MarketingDashboardSummaryQueryDto } from './marketing-dashboard-summary-query.dto';

export class MarketingDashboardTableQueryDto extends MarketingDashboardSummaryQueryDto {
  @ApiPropertyOptional({ example: '1', default: '1' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: '25', default: '25' })
  @IsOptional()
  @IsString()
  pageSize?: string;

  @ApiPropertyOptional({
    example: 'spend',
    enum: [
      'spend',
      'impressions',
      'clicks',
      'conversions',
      'registrations',
      'cpc',
      'ctr',
      'cpm',
      'cpl',
      'campaignName',
      'adsetName',
      'adName',
    ],
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ example: 'desc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: string;
}
