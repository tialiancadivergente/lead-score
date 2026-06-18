import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { AuthModule } from '../auth/auth.module';
import { Launch } from '../database/entities/marketing/launch.entity';
import { Season } from '../database/entities/marketing/season.entity';
import { SeasonController } from './season.controller';
import { SeasonService } from './season.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Season, Launch])],
  controllers: [SeasonController],
  providers: [SeasonService, ApiKeyGuard],
})
export class SeasonModule {}
