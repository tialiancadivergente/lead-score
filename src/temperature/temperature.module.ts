import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { Temperature } from '../database/entities/marketing/temperature.entity';
import { TemperatureController } from './temperature.controller';
import { TemperatureService } from './temperature.service';

@Module({
  imports: [TypeOrmModule.forFeature([Temperature])],
  controllers: [TemperatureController],
  providers: [TemperatureService, ApiKeyGuard],
})
export class TemperatureModule {}
