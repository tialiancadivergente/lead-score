import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HotmartSaleRaw } from '../database/entities/hotmart/hotmart-sale-raw.entity';
import { HotmartSale } from '../database/entities/hotmart/hotmart-sale.entity';
import { IdentifierType } from '../database/entities/identity/identifier-type.entity';
import { Person } from '../database/entities/identity/person.entity';
import { PersonIdentifier } from '../database/entities/identity/person-identifier.entity';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { ServiceBusModule } from '../service-bus/service-bus.module';
import { HotmartController } from './hotmart.controller';
import { HotmartProcessorService } from './hotmart-processor.service';
import { HotmartSaleConsumer } from './hotmart-sale.consumer';
import { HotmartSchedulerService } from './hotmart-scheduler.service';
import { HotmartService } from './hotmart.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HotmartSaleRaw,
      HotmartSale,
      Person,
      PersonIdentifier,
      IdentifierType,
    ]),
    ServiceBusModule,
  ],
  controllers: [HotmartController],
  providers: [
    HotmartService,
    HotmartProcessorService,
    HotmartSaleConsumer,
    HotmartSchedulerService,
    ApiKeyGuard,
  ],
  exports: [HotmartService, HotmartProcessorService],
})
export class HotmartModule {}
