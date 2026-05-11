import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ServiceBusReceivedMessage } from '@azure/service-bus';
import { ServiceBusService } from '../service-bus/service-bus.service';
import { HotmartProcessorService } from './hotmart-processor.service';

const ENABLED =
  process.env.HOTMART_PROCESS_VIA_QUEUE === 'true' &&
  (process.env.SERVICE_BUS_HOTMART_SALE_CONSUMER_ENABLED ?? process.env.SERVICE_BUS_CONSUMER_ENABLED) === 'true';
const QUEUE = process.env.SERVICE_BUS_HOTMART_SALE_QUEUE ?? 'hotmart-sale-process';
const CONCURRENCY = Number(process.env.SERVICE_BUS_HOTMART_SALE_MAX_CONCURRENCY ?? '5');

@Injectable()
export class HotmartSaleConsumer implements OnModuleInit {
  private readonly logger = new Logger(HotmartSaleConsumer.name);

  constructor(
    private readonly serviceBus: ServiceBusService,
    private readonly processor: HotmartProcessorService,
  ) {}

  onModuleInit() {
    if (!ENABLED) {
      this.logger.log('HotmartSaleConsumer desabilitado (HOTMART_PROCESS_VIA_QUEUE != true)');
      return;
    }
    this.serviceBus.createQueueProcessor({
      queueName: QUEUE,
      onMessage: (msg) => this.handleMessage(msg),
      onError: (err) => this.logger.error(`Service Bus error: ${err.message}`),
      maxConcurrentCalls: CONCURRENCY,
    });
    this.logger.log(`HotmartSaleConsumer escutando: ${QUEUE}`);
  }

  private async handleMessage(message: ServiceBusReceivedMessage): Promise<void> {
    const { rawId } = message.body as { rawId: string };
    if (!rawId) throw new Error('Mensagem sem rawId');
    await this.processor.processRaw(rawId);
  }
}
