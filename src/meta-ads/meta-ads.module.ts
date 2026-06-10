import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OAuthConnection } from '../database/entities/integrations/oauth-connection.entity';
import { MarketingConnectionAccount } from '../database/entities/marketing-sync/marketing-connection-account.entity';
import { MetaAdPerformance } from '../database/entities/meta-ads/meta-ad-performance.entity';
import { MetaAdRaw } from '../database/entities/meta-ads/meta-ad-raw.entity';
import { MetaAdsetRaw } from '../database/entities/meta-ads/meta-adset-raw.entity';
import { MetaCampaignRaw } from '../database/entities/meta-ads/meta-campaign-raw.entity';
import { MetaSyncExecution } from '../database/entities/meta-ads/meta-sync-execution.entity';
import { MetaSyncSchedule } from '../database/entities/meta-ads/meta-sync-schedule.entity';
import { OauthModule } from '../oauth/oauth.module';
import { MetaAdsController } from './meta-ads.controller';
import { MetaAdsService } from './meta-ads.service';
import { MetaBatchService } from './meta-batch.service';
import { MetaJobService } from './meta-job.service';
import { MetaProcessorService } from './meta-processor.service';
import { MetaSchedulerService } from './meta-scheduler.service';
import { MetaSyncScheduleService } from './meta-sync-schedule.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OAuthConnection,
      MarketingConnectionAccount,
      MetaCampaignRaw,
      MetaAdsetRaw,
      MetaAdRaw,
      MetaAdPerformance,
      MetaSyncExecution,
      MetaSyncSchedule,
    ]),
    OauthModule,
  ],
  controllers: [MetaAdsController],
  providers: [
    MetaAdsService,
    MetaBatchService,
    MetaJobService,
    MetaProcessorService,
    MetaSchedulerService,
    MetaSyncScheduleService,
  ],
  exports: [MetaAdsService],
})
export class MetaAdsModule {}
