import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { ServiceBusModule } from './service-bus/service-bus.module';
import { LeadRegistrationModule } from './lead-registration/lead-registration.module';
import { LeadScoreModule } from './lead-score/lead-score.module';
import { CaptureModule } from './capture/capture.module';
import { TemperatureModule } from './temperature/temperature.module';
import { LaunchModule } from './launch/launch.module';
import { SeasonModule } from './season/season.module';
import { VotingModule } from './voting/voting.module';
import { FormModule } from './form/form.module';
import { OauthModule } from './oauth/oauth.module';
import { MarketingDashboardModule } from './marketing-dashboard/marketing-dashboard.module';
import { MarketingSyncModule } from './marketing-sync/marketing-sync.module';
import { HotmartModule } from './hotmart/hotmart.module';
import { MetaAdsModule } from './meta-ads/meta-ads.module';
import { LaunchDashboardModule } from './launch-dashboard/launch-dashboard.module';
import { InleadWebhookModule } from './inlead-webhook/inlead-webhook.module';
import { PageModule } from './page/page.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { CopilotModule } from './copilot/copilot.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      expandVariables: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),
    DatabaseModule,
    AuthModule,
    UsersModule,
    RolesModule,
    ServiceBusModule,
    LeadRegistrationModule,
    LeadScoreModule,
    CaptureModule,
    TemperatureModule,
    LaunchModule,
    SeasonModule,
    FormModule,
    VotingModule,
    OauthModule,
    MarketingSyncModule,
    MarketingDashboardModule,
    HotmartModule,
    MetaAdsModule,
    LaunchDashboardModule,
    InleadWebhookModule,
    PageModule,
    CopilotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
