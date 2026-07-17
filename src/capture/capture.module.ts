import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { AuthModule } from '../auth/auth.module';
import { Capture } from '../database/entities/capture/capture.entity';
import { CaptureExportJob } from '../database/entities/capture/capture-export-job.entity';
import { FormAnswer } from '../database/entities/form/form-answer.entity';
import { FormResponse } from '../database/entities/form/form-response.entity';
import { LeadscoreResult } from '../database/entities/leadscore/leadscore-result.entity';
import { PersonIdentifier } from '../database/entities/identity/person-identifier.entity';
import { CaptureController } from './capture.controller';
import { CaptureService } from './capture.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Capture,
      CaptureExportJob,
      PersonIdentifier,
      FormResponse,
      FormAnswer,
      LeadscoreResult,
    ]),
  ],
  controllers: [CaptureController],
  providers: [CaptureService, ApiKeyGuard],
})
export class CaptureModule {}
