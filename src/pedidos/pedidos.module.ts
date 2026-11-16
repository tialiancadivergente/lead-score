import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { DatabricksModule } from '../databricks/databricks.module';
import { PedidosController } from './pedidos.controller';
import { PedidosService } from './pedidos.service';

@Module({
  imports: [ConfigModule, DatabricksModule],
  controllers: [PedidosController],
  providers: [PedidosService, ApiKeyGuard],
  exports: [PedidosService],
})
export class PedidosModule {}
