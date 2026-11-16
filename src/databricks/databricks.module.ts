import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabricksService } from './databricks.service';

@Module({
  imports: [ConfigModule],
  providers: [DatabricksService],
  exports: [DatabricksService],
})
export class DatabricksModule {}
