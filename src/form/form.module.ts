import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { Form } from '../database/entities/form/form.entity';
import { FormVersion } from '../database/entities/form/form-version.entity';
import { Question } from '../database/entities/form/question.entity';
import { QuestionOption } from '../database/entities/form/question-option.entity';
import { FormVersionQuestion } from '../database/entities/form/form-version-question.entity';
import { Launch } from '../database/entities/marketing/launch.entity';
import { Season } from '../database/entities/marketing/season.entity';
import { Leadscore } from '../database/entities/leadscore/leadscore.entity';
import { LeadscoreOptionPoints } from '../database/entities/leadscore/leadscore-option-points.entity';
import { LeadscoreRangePoints } from '../database/entities/leadscore/leadscore-range-points.entity';
import { FormController } from './form.controller';
import { FormManagementController } from './form-management.controller';
import { FormManagementService } from './form-management.service';
import { FormService } from './form.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Form,
      FormVersion,
      Question,
      QuestionOption,
      FormVersionQuestion,
      Launch,
      Season,
      Leadscore,
      LeadscoreOptionPoints,
      LeadscoreRangePoints,
    ]),
  ],
  controllers: [FormController, FormManagementController],
  providers: [FormService, FormManagementService, ApiKeyGuard],
})
export class FormModule {}
