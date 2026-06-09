import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InleadWebhookActiveCampaignLog } from '../database/entities/inlead/inlead-webhook-activecampaign-log.entity';
import { ActiveCampaignService } from '../lead-registration/services/activecampaign.service';
import { InleadWebhookController } from './inlead-webhook.controller';
import { InleadWebhookService } from './inlead-webhook.service';

@Module({
  imports: [TypeOrmModule.forFeature([InleadWebhookActiveCampaignLog])],
  controllers: [InleadWebhookController],
  providers: [InleadWebhookService, ActiveCampaignService],
})
export class InleadWebhookModule {}
