import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Capture } from '../database/entities/capture/capture.entity';
import { LeadRegistrationController } from './lead-registration.controller';
import { LeadRegistrationService } from './lead-registration.service';
import { ActiveCampaignService } from './services/activecampaign.service';
import { LeadPersistenceService } from './services/lead-persistence.service';
import { LeadRegistrationConsumer } from './workers/lead-registration.consumer';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Capture])],
  controllers: [LeadRegistrationController],
  providers: [
    LeadRegistrationService,
    ActiveCampaignService,
    LeadPersistenceService,
    LeadRegistrationConsumer,
    ApiKeyGuard,
  ],
})
export class LeadRegistrationModule {}
