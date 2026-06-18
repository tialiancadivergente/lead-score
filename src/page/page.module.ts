import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { AuthModule } from '../auth/auth.module';
import { Form } from '../database/entities/form/form.entity';
import { FormVersion } from '../database/entities/form/form-version.entity';
import { Launch } from '../database/entities/marketing/launch.entity';
import { Season } from '../database/entities/marketing/season.entity';
import { Temperature } from '../database/entities/marketing/temperature.entity';
import { PageHeadline } from '../database/entities/page/page-headline.entity';
import { PageTemperature } from '../database/entities/page/page-temperature.entity';
import { PageVersion } from '../database/entities/page/page-version.entity';
import { Page } from '../database/entities/page/page.entity';
import { PageController } from './page.controller';
import { PageService } from './page.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Page,
      PageHeadline,
      PageTemperature,
      PageVersion,
      Launch,
      Season,
      Form,
      FormVersion,
      Temperature,
    ]),
  ],
  controllers: [PageController],
  providers: [PageService, ApiKeyGuard],
})
export class PageModule {}
