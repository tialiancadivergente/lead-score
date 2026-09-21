import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServiceBusReceivedMessage } from '@azure/service-bus';
import { CaptureService, CAPTURE_EXPORT_QUEUE } from '../capture.service';
import { ServiceBusService } from '../../service-bus/service-bus.service';

@Injectable()
export class CaptureExportConsumer implements OnModuleInit {
  private readonly logger = new Logger(CaptureExportConsumer.name);

  constructor(
    private readonly config: ConfigService,
    private readonly captureService: CaptureService,
    private readonly serviceBus: ServiceBusService,
  ) {}

  onModuleInit() {
    const consumerEnabled =
      this.config.get<string>('SERVICE_BUS_CONSUMER_ENABLED', 'false') ===
        'true' &&
      this.config.get<string>(
        'SERVICE_BUS_CAPTURE_EXPORT_CONSUMER_ENABLED',
        'false',
      ) === 'true';

    if (!consumerEnabled) {
      this.logger.log(
        'CaptureExportConsumer desabilitado (SERVICE_BUS_CAPTURE_EXPORT_CONSUMER_ENABLED != true)',
      );
      return;
    }

    this.serviceBus.createQueueProcessor({
      queueName: this.config.get<string>(
        'SERVICE_BUS_CAPTURE_EXPORT_QUEUE',
        CAPTURE_EXPORT_QUEUE,
      ),
      maxConcurrentCalls: Number(
        this.config.get<string>(
          'SERVICE_BUS_CAPTURE_EXPORT_MAX_CONCURRENCY',
          '1',
        ),
      ),
      onMessage: (message: ServiceBusReceivedMessage) =>
        this.handleMessage(message),
    });

    this.logger.log(
      `CaptureExportConsumer escutando: ${this.config.get<string>(
        'SERVICE_BUS_CAPTURE_EXPORT_QUEUE',
        CAPTURE_EXPORT_QUEUE,
      )}`,
    );
  }

  private async handleMessage(message: ServiceBusReceivedMessage) {
    const body = message.body as { jobId?: unknown };
    const jobId = typeof body?.jobId === 'string' ? body.jobId : null;

    if (!jobId) {
      throw new Error('Mensagem de capture export sem jobId.');
    }

    await this.captureService.processExportJobById(jobId);
  }
}
