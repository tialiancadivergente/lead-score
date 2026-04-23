import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Capture } from '../database/entities/capture/capture.entity';
import { FormAnswer } from '../database/entities/form/form-answer.entity';
import { FormResponse } from '../database/entities/form/form-response.entity';
import { FormVersion } from '../database/entities/form/form-version.entity';
import { FormVersionQuestion } from '../database/entities/form/form-version-question.entity';
import { Question } from '../database/entities/form/question.entity';
import { QuestionOption } from '../database/entities/form/question-option.entity';
import { LeadscoreOptionPoints } from '../database/entities/leadscore/leadscore-option-points.entity';
import { LeadscoreRangePoints } from '../database/entities/leadscore/leadscore-range-points.entity';
import { LeadscoreResult } from '../database/entities/leadscore/leadscore-result.entity';
import { LeadscoreTierRule } from '../database/entities/leadscore/leadscore-tier-rule.entity';
import { Leadscore } from '../database/entities/leadscore/leadscore.entity';
import { LeadScoreController } from './lead-score.controller';
import { LeadScoreService } from './lead-score.service';
import { LeadScoreActiveCampaignService } from './services/activecampaign.service';
import { LeadScorePersistenceService } from './services/lead-score-persistence.service';
import { LeadScoreQuestionsService } from './services/lead-score-questions.service';
import { LeadScoreConsumer } from './workers/lead-score.consumer';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Capture,
      FormVersion,
      FormVersionQuestion,
      Question,
      QuestionOption,
      FormResponse,
      FormAnswer,
      Leadscore,
      LeadscoreOptionPoints,
      LeadscoreRangePoints,
      LeadscoreTierRule,
      LeadscoreResult,
    ]),
  ],
  controllers: [LeadScoreController],
  providers: [
    LeadScoreService,
    LeadScoreActiveCampaignService,
    LeadScorePersistenceService,
    LeadScoreQuestionsService,
    LeadScoreConsumer,
    ApiKeyGuard,
  ],
})
export class LeadScoreModule {}
