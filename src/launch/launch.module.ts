import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { Launch } from '../database/entities/marketing/launch.entity';
import { LaunchController } from './launch.controller';
import { LaunchService } from './launch.service';

@Module({
  imports: [TypeOrmModule.forFeature([Launch])],
  controllers: [LaunchController],
  providers: [LaunchService, ApiKeyGuard],
})
export class LaunchModule {}
