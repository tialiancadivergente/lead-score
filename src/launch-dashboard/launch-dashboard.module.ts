import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { Capture } from '../database/entities/capture/capture.entity';
import { HotmartSale } from '../database/entities/hotmart/hotmart-sale.entity';
import { Launch } from '../database/entities/marketing/launch.entity';
import { MetaAdPerformance } from '../database/entities/meta-ads/meta-ad-performance.entity';
import { LaunchDashboardController } from './launch-dashboard.controller';
import { LaunchDashboardService } from './launch-dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MetaAdPerformance, Capture, HotmartSale, Launch]),
  ],
  controllers: [LaunchDashboardController],
  providers: [LaunchDashboardService, ApiKeyGuard],
})
export class LaunchDashboardModule {}
