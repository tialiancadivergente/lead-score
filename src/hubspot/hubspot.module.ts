import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { PedidosModule } from '../pedidos/pedidos.module';
import { HubspotLeadEnrichmentService } from './hubspot-lead-enrichment.service';
import { HubspotController } from './hubspot.controller';
import { HubspotService } from './hubspot.service';

@Module({
  imports: [ConfigModule, PedidosModule],
  controllers: [HubspotController],
  providers: [HubspotService, HubspotLeadEnrichmentService, ApiKeyGuard],
})
export class HubspotModule {}
