import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { AuthModule } from '../auth/auth.module';
import { Capture } from '../database/entities/capture/capture.entity';
import { FormAnswer } from '../database/entities/form/form-answer.entity';
import { FormResponse } from '../database/entities/form/form-response.entity';
import { Question } from '../database/entities/form/question.entity';
import { QuestionOption } from '../database/entities/form/question-option.entity';
import { HotmartProduct } from '../database/entities/hotmart/hotmart-product.entity';
import { HotmartSale } from '../database/entities/hotmart/hotmart-sale.entity';
import { LaunchDashboardConfig } from '../database/entities/launch-dashboard/launch-dashboard-config.entity';
import { Launch } from '../database/entities/marketing/launch.entity';
import { MetaAdPerformance } from '../database/entities/meta-ads/meta-ad-performance.entity';
import { LeadscoreResult } from '../database/entities/leadscore/leadscore-result.entity';
import { LaunchDashboardController } from './launch-dashboard.controller';
import { LaunchDashboardService } from './launch-dashboard.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      MetaAdPerformance,
      Capture,
      HotmartSale,
      HotmartProduct,
      Launch,
      LaunchDashboardConfig,
      FormResponse,
      FormAnswer,
      Question,
      QuestionOption,
      LeadscoreResult,
    ]),
  ],
  controllers: [LaunchDashboardController],
  providers: [LaunchDashboardService, ApiKeyGuard],
})
export class LaunchDashboardModule {}
