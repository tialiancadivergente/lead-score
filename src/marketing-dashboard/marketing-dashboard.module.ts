import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { Capture } from '../database/entities/capture/capture.entity';
import { Launch } from '../database/entities/marketing/launch.entity';
import { Season } from '../database/entities/marketing/season.entity';
import { MarketingAdDailyPerformance } from '../database/entities/marketing-sync/marketing-ad-daily-performance.entity';
import { MarketingDashboardController } from './marketing-dashboard.controller';
import { MarketingDashboardService } from './marketing-dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MarketingAdDailyPerformance,
      Capture,
      Launch,
      Season,
    ]),
  ],
  controllers: [MarketingDashboardController],
  providers: [MarketingDashboardService, ApiKeyGuard],
})
export class MarketingDashboardModule {}
