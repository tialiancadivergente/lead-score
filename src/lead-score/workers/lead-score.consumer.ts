import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServiceBusReceivedMessage } from '@azure/service-bus';
import { ServiceBusService } from '../../service-bus/service-bus.service';
import { LeadScorePersistenceService } from '../services/lead-score-persistence.service';
import { LeadScoreQueueMessage } from '../lead-score.service';

@Injectable()
export class LeadScoreConsumer implements OnModuleInit {
  private readonly logger = new Logger(LeadScoreConsumer.name);

  constructor(
    private readonly serviceBus: ServiceBusService,
    private readonly config: ConfigService,
    private readonly persistence: LeadScorePersistenceService,
  ) {}

  onModuleInit() {
    const enabledSpecific = this.config.get<string>(
      'SERVICE_BUS_LEAD_SCORE_CONSUMER_ENABLED',
    );
    const enabledFallback = this.config.get<string>(
      'SERVICE_BUS_CONSUMER_ENABLED',
      'false',
    );
    const enabled = (enabledSpecific ?? enabledFallback) === 'true';

    if (!enabled) {
      this.logger.log(
        'Consumer de lead score desabilitado (SERVICE_BUS_LEAD_SCORE_CONSUMER_ENABLED=false).',
      );
      return;
    }

    const queueName = this.config.get<string>(
      'SERVICE_BUS_LEAD_SCORE_QUEUE',
      'lead-score',
    );
    this.logger.log(`Iniciando consumer da fila "${queueName}"...`);

    this.serviceBus.createQueueProcessor({
      queueName,
      onMessage: (message: ServiceBusReceivedMessage) =>
        Promise.resolve(this.handleMessage(message)),
      onError: (err) => this.logger.error(err.message, err.stack),
      maxConcurrentCalls: Number(
        this.config.get<string>('SERVICE_BUS_LEAD_SCORE_MAX_CONCURRENCY', '5'),
      ),
    });
  }

  private async handleMessage(message: ServiceBusReceivedMessage) {
    const rawBody = message.body as unknown;
    const typed =
      rawBody && typeof rawBody === 'object'
        ? ((rawBody as Partial<LeadScoreQueueMessage>) as Partial<
            LeadScoreQueueMessage & Record<string, any>
          >)
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

    this.logger.log(`Processando lead score (requestId=${requestId})...`);

    const payloadForProcessing = {
      ...payload,
      requestId,
      serviceBus: {
        messageId: message.messageId,
        enqueuedTimeUtc: message.enqueuedTimeUtc,
        sequenceNumber: message.sequenceNumber,
      },
    };

    try {
      const db = await this.persistence.persistLeadScore(payloadForProcessing);

      this.logger.log(
        `Lead score persistido (requestId=${requestId}, formResponseId=${db.formResponseId}, leadscoreResultId=${db.leadscoreResultId}, reused=${db.reused}).`,
      );

      this.logger.log(
        `Lead score processado com sucesso (requestId=${requestId}, formResponseId=${db.formResponseId}, leadscoreResultId=${db.leadscoreResultId}).`,
      );
      return;
    } catch (error) {
      this.logger.error(
        `Falha ao persistir lead score (requestId=${requestId}): ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new Error(`Falha ao processar lead score (requestId=${requestId}).`);
    }
  }
}
