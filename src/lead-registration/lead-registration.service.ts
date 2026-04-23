import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServiceBusService } from '../service-bus/service-bus.service';
import { randomUUID } from 'crypto';

export type LeadRegistrationQueueMessage = {
  payload: Record<string, any>;
  requestId: string;
  enqueuedAt: string;
  source?: string;
};

@Injectable()
export class LeadRegistrationService {
  private readonly logger = new Logger(LeadRegistrationService.name);

  constructor(
    private readonly serviceBus: ServiceBusService,
    private readonly config: ConfigService,
  ) {}

  async enqueueLeadRegistration(payload: Record<string, any>) {
    const queueName = this.config.get<string>(
      'SERVICE_BUS_LEAD_REGISTRATION_QUEUE',
      'lead-registration',
    );

    const message: LeadRegistrationQueueMessage = {
      payload,
      requestId: randomUUID(),
      enqueuedAt: new Date().toISOString(),
      source: 'http:start',
    };

    await this.serviceBus.publish(queueName, message, {
      subject: 'lead.registration',
    });

    this.logger.log(
      `Solicitação enfileirada em "${queueName}" (requestId=${message.requestId}).`,
    );

    return {
      queued: true,
      queueName,
      requestId: message.requestId,
    };
  }
}
