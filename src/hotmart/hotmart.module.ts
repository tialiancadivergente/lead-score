import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HotmartProduct } from '../database/entities/hotmart/hotmart-product.entity';
import { HotmartSaleRaw } from '../database/entities/hotmart/hotmart-sale-raw.entity';
import { HotmartSale } from '../database/entities/hotmart/hotmart-sale.entity';
import { HotmartSyncSchedule } from '../database/entities/hotmart/hotmart-sync-schedule.entity';
import { IdentifierType } from '../database/entities/identity/identifier-type.entity';
import { Person } from '../database/entities/identity/person.entity';
import { PersonIdentifier } from '../database/entities/identity/person-identifier.entity';
import { Launch } from '../database/entities/marketing/launch.entity';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { ServiceBusModule } from '../service-bus/service-bus.module';
import { HotmartController } from './hotmart.controller';
import { HotmartProcessorService } from './hotmart-processor.service';
import { HotmartProductService } from './hotmart-product.service';
import { HotmartSaleConsumer } from './hotmart-sale.consumer';
import { HotmartSchedulerService } from './hotmart-scheduler.service';
import { HotmartService } from './hotmart.service';
import { HotmartSyncScheduleService } from './hotmart-sync-schedule.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HotmartSaleRaw,
      HotmartSale,
      HotmartProduct,
      HotmartSyncSchedule,
      Person,
      PersonIdentifier,
      IdentifierType,
      Launch,
    ]),
    ServiceBusModule,
  ],
  controllers: [HotmartController],
  providers: [
    HotmartService,
    HotmartProcessorService,
    HotmartProductService,
    HotmartSaleConsumer,
    HotmartSchedulerService,
    HotmartSyncScheduleService,
    ApiKeyGuard,
  ],
  exports: [HotmartService, HotmartProcessorService, HotmartProductService, HotmartSyncScheduleService],
})
export class HotmartModule {}
