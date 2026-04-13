import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServiceBusReceivedMessage } from '@azure/service-bus';
import { ServiceBusService } from '../service-bus/service-bus.service';
import {
  MarketingExtractQueueMessage,
} from './marketing-sync.service';
import { MarketingExtractProcessorService } from './marketing-extract-processor.service';

@Injectable()
export class MarketingSyncConsumer implements OnModuleInit {
  private readonly logger = new Logger(MarketingSyncConsumer.name);

  constructor(
    private readonly serviceBus: ServiceBusService,
    private readonly config: ConfigService,
    private readonly processor: MarketingExtractProcessorService,
  ) {}

  onModuleInit() {
    const enabledSpecific = this.config.get<string>(
      'SERVICE_BUS_MARKETING_EXTRACT_CONSUMER_ENABLED',
    );
    const enabledFallback = this.config.get<string>(
      'SERVICE_BUS_CONSUMER_ENABLED',
      'false',
    );
    const enabled = (enabledSpecific ?? enabledFallback) === 'true';

    if (!enabled) {
      this.logger.log(
        'Consumer de marketing extract desabilitado (SERVICE_BUS_MARKETING_EXTRACT_CONSUMER_ENABLED=false).',
      );
      return;
    }

    const queueName = this.config.get<string>(
      'SERVICE_BUS_MARKETING_EXTRACT_QUEUE',
      'marketing-extract',
    );

    this.logger.log(`Iniciando consumer da fila "${queueName}"...`);

    this.serviceBus.createQueueProcessor({
      queueName,
      onMessage: (message) => Promise.resolve(this.handleMessage(message)),
      onError: (err) => this.logger.error(err.message, err.stack),
      maxConcurrentCalls: Number(
        this.config.get<string>(
          'SERVICE_BUS_MARKETING_EXTRACT_MAX_CONCURRENCY',
          '3',
        ),
      ),
    });
  }

  private async handleMessage(message: ServiceBusReceivedMessage) {
    const rawBody = message.body as unknown;
    const typed =
      rawBody && typeof rawBody === 'object'
        ? (rawBody as Partial<MarketingExtractQueueMessage> & Record<string, any>)
        : {};

    const jobId = String(typed.jobId ?? '');
    if (!jobId) {
      throw new Error('Mensagem da fila sem jobId.');
    }

    await this.processor.processJob(jobId);
  }
}
