import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CopilotConversation } from '../database/entities/copilot/copilot-conversation.entity';
import { CopilotMessage } from '../database/entities/copilot/copilot-message.entity';
import { CopilotRiskAlert } from '../database/entities/copilot/copilot-risk-alert.entity';
import { CopilotConfig } from '../database/entities/copilot/copilot-config.entity';
import { MetaAdPerformance } from '../database/entities/meta-ads/meta-ad-performance.entity';
import { Launch } from '../database/entities/marketing/launch.entity';
import { LaunchDashboardConfig } from '../database/entities/launch-dashboard/launch-dashboard-config.entity';
import { LaunchDashboardModule } from '../launch-dashboard/launch-dashboard.module';
import { CopilotController } from './copilot.controller';
import { CopilotLlmService } from './services/copilot-llm.service';
import { CopilotToolsService } from './services/copilot-tools.service';
import { CopilotConfigService } from './services/copilot-config.service';
import { CopilotRiskAlertsService } from './services/copilot-risk-alerts.service';
import { CopilotRiskEngineService } from './services/copilot-risk-engine.service';
import { CopilotChatService } from './services/copilot-chat.service';

@Module({
  imports: [
    AuthModule,
    LaunchDashboardModule,
    TypeOrmModule.forFeature([
      CopilotConversation,
      CopilotMessage,
      CopilotRiskAlert,
      CopilotConfig,
      MetaAdPerformance,
      Launch,
      LaunchDashboardConfig,
    ]),
  ],
  controllers: [CopilotController],
  providers: [
    ApiKeyGuard,
    CopilotLlmService,
    CopilotToolsService,
    CopilotConfigService,
    CopilotRiskAlertsService,
    CopilotRiskEngineService,
    CopilotChatService,
  ],
})
export class CopilotModule {}
