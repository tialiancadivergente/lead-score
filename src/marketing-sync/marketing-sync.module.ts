import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { OAuthConnection } from '../database/entities/integrations/oauth-connection.entity';
import { MarketingCampaignDailyPerformance } from '../database/entities/marketing-sync/marketing-campaign-daily-performance.entity';
import { MarketingConnectionAccount } from '../database/entities/marketing-sync/marketing-connection-account.entity';
import { MarketingExtractJob } from '../database/entities/marketing-sync/marketing-extract-job.entity';
import { MarketingExtractRaw } from '../database/entities/marketing-sync/marketing-extract-raw.entity';
import { OauthModule } from '../oauth/oauth.module';
import { MarketingExtractProcessorService } from './marketing-extract-processor.service';
import { MarketingSyncConsumer } from './marketing-sync.consumer';
import { MarketingSyncController } from './marketing-sync.controller';
import { MarketingSyncService } from './marketing-sync.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OAuthConnection,
      MarketingConnectionAccount,
      MarketingExtractJob,
      MarketingExtractRaw,
      MarketingCampaignDailyPerformance,
    ]),
    OauthModule,
  ],
  controllers: [MarketingSyncController],
  providers: [
    MarketingSyncService,
    MarketingExtractProcessorService,
    MarketingSyncConsumer,
    ApiKeyGuard,
  ],
})
export class MarketingSyncModule {}
