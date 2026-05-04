import { ApiPropertyOptional } from '@nestjs/swagger';
import { MarketingDashboardSummaryQueryDto } from './marketing-dashboard-summary-query.dto';

export class MarketingDashboardTableQueryDto extends MarketingDashboardSummaryQueryDto {
  @ApiPropertyOptional({ example: '1', default: '1' })
  page?: string;

  @ApiPropertyOptional({ example: '25', default: '25' })
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
  sortBy?: string;

  @ApiPropertyOptional({ example: 'desc', enum: ['asc', 'desc'] })
  sortOrder?: string;
}
