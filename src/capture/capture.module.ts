import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogModule } from '../audit/audit-log.module';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CaptureSyncApiKeyGuard } from '../common/guards/capture-sync-api-key.guard';
import { AuthModule } from '../auth/auth.module';
import { ServiceBusModule } from '../service-bus/service-bus.module';
import { Capture } from '../database/entities/capture/capture.entity';
import { CaptureExportJob } from '../database/entities/capture/capture-export-job.entity';
import { FormAnswer } from '../database/entities/form/form-answer.entity';
import { FormResponse } from '../database/entities/form/form-response.entity';
import { LeadscoreResult } from '../database/entities/leadscore/leadscore-result.entity';
import { PersonIdentifier } from '../database/entities/identity/person-identifier.entity';
import { CaptureController } from './capture.controller';
import { CaptureExportStorageService } from './capture-export-storage.service';
import { CaptureSyncController } from './capture-sync.controller';
import { CaptureService } from './capture.service';
import { CaptureExportConsumer } from './workers/capture-export.consumer';

@Module({
  imports: [
    AuthModule,
    AuditLogModule,
    ServiceBusModule,
    TypeOrmModule.forFeature([
      Capture,
      CaptureExportJob,
      PersonIdentifier,
      FormResponse,
      FormAnswer,
      LeadscoreResult,
    ]),
  ],
  controllers: [CaptureController, CaptureSyncController],
  providers: [
    CaptureService,
    CaptureExportStorageService,
    CaptureExportConsumer,
    ApiKeyGuard,
    CaptureSyncApiKeyGuard,
  ],
})
export class CaptureModule {}
