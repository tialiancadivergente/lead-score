import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HotmartSaleRaw } from '../database/entities/hotmart/hotmart-sale-raw.entity';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { HotmartController } from './hotmart.controller';
import { HotmartSchedulerService } from './hotmart-scheduler.service';
import { HotmartService } from './hotmart.service';

@Module({
  imports: [TypeOrmModule.forFeature([HotmartSaleRaw])],
  controllers: [HotmartController],
  providers: [HotmartService, HotmartSchedulerService, ApiKeyGuard],
  exports: [HotmartService],
})
export class HotmartModule {}
