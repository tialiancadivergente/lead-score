import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServiceBusReceivedMessage } from '@azure/service-bus';
import { ServiceBusService } from '../../service-bus/service-bus.service';
import { ActiveCampaignService } from '../services/activecampaign.service';
import { LeadPersistenceService } from '../services/lead-persistence.service';
import { LeadRegistrationQueueMessage } from '../lead-registration.service';

@Injectable()
export class LeadRegistrationConsumer implements OnModuleInit {
  private readonly logger = new Logger(LeadRegistrationConsumer.name);

  constructor(
    private readonly serviceBus: ServiceBusService,
    private readonly config: ConfigService,
    private readonly activeCampaign: ActiveCampaignService,
    private readonly persistence: LeadPersistenceService,
  ) {}

  onModuleInit() {
    const enabledSpecific = this.config.get<string>(
      'SERVICE_BUS_LEAD_REGISTRATION_CONSUMER_ENABLED',
    );
    const enabledFallback = this.config.get<string>(
      'SERVICE_BUS_CONSUMER_ENABLED',
      'false',
    );
    const enabled = (enabledSpecific ?? enabledFallback) === 'true';

    if (!enabled) {
      this.logger.log(
        'Consumer de cadastro de lead desabilitado (SERVICE_BUS_LEAD_REGISTRATION_CONSUMER_ENABLED=false).',
      );
      return;
    }

    const queueName = this.config.get<string>(
      'SERVICE_BUS_LEAD_REGISTRATION_QUEUE',
      'lead-registration',
    );
    this.logger.log(`Iniciando consumer da fila "${queueName}"...`);

    this.serviceBus.createQueueProcessor({
      queueName,
      onMessage: (message: ServiceBusReceivedMessage) =>
        Promise.resolve(this.handleMessage(message)),
      onError: (err) => this.logger.error(err.message, err.stack),
      maxConcurrentCalls: Number(
        this.config.get<string>(
          'SERVICE_BUS_LEAD_REGISTRATION_MAX_CONCURRENCY',
          '5',
        ),
      ),
    });
  }

  private async handleMessage(message: ServiceBusReceivedMessage) {
    const rawBody = message.body as unknown;
    const typed =
      rawBody && typeof rawBody === 'object'
        ? (rawBody as Partial<LeadRegistrationQueueMessage> &
            Record<string, any>)
        : {};

    const payload = (typed.payload ?? typed ?? {}) as Record<string, any>;
    const requestId = String(typed.requestId ?? message.messageId ?? 'unknown');

    this.logger.debug(
      `Mensagem recebida (requestId=${requestId}): ` +
        JSON.stringify(
          {
            messageId: message.messageId,
            sequenceNumber: message.sequenceNumber,
            enqueuedTimeUtc: message.enqueuedTimeUtc,
            body: rawBody,
          },
          null,
          2,
        ),
    );

    this.logger.log(`Processando lead (requestId=${requestId})...`);

    const payloadForDb = {
      ...payload,
      requestId,
      serviceBus: {
        messageId: message.messageId,
        enqueuedTimeUtc: message.enqueuedTimeUtc,
        sequenceNumber: message.sequenceNumber,
      },
    };

    // Executa em paralelo: ActiveCampaign + persistência no banco
    const [ac, db] = await Promise.allSettled([
      this.activeCampaign.createContact(payload),
      this.persistence.persistLead(payloadForDb),
    ]);

    if (db.status === 'rejected') {
      this.logger.error(
        `Falha ao persistir no banco (requestId=${requestId}): ${db.reason instanceof Error ? db.reason.message : String(db.reason)}`,
        db.reason instanceof Error ? db.reason.stack : undefined,
      );
    } else {
      this.logger.log(
        `Persistido no banco (requestId=${requestId}, captureId=${db.value.captureId}, reused=${db.value.reused}).`,
      );
    }

    if (ac.status === 'rejected') {
      this.logger.error(
        `Falha no ActiveCampaign (requestId=${requestId}): ${ac.reason instanceof Error ? ac.reason.message : String(ac.reason)}`,
        ac.reason instanceof Error ? ac.reason.stack : undefined,
      );
    } else {
      this.logger.log(`ActiveCampaign OK (requestId=${requestId}).`);
    }

    // Se ambos deram certo, anexa resposta do ActiveCampaign no registro do banco
    if (db.status === 'fulfilled' && ac.status === 'fulfilled') {
      await this.persistence.attachActiveCampaign(
        db.value.captureId,
        ac.value as Record<string, any>,
      );
      this.logger.log(
        `Lead processado com sucesso (requestId=${requestId}, captureId=${db.value.captureId}).`,
      );
      return;
    }

    // Se algo falhou, lança erro para o Service Bus reprocessar (retry/DLQ).
    // A persistência no banco é idempotente via requestId para reduzir duplicação em retries.
    throw new Error(`Falha ao processar lead (requestId=${requestId}).`);
  }
}
