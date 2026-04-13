import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
} from '@nestjs/common';
import {
  ServiceBusClient,
  ServiceBusReceivedMessage,
  ServiceBusReceiver,
  ServiceBusSender,
} from '@azure/service-bus';

@Injectable()
export class ServiceBusService implements OnApplicationShutdown {
  private readonly logger = new Logger(ServiceBusService.name);
  private readonly senders = new Map<string, ServiceBusSender>();
  private readonly receivers: ServiceBusReceiver[] = [];
  private readonly receiverSubscriptions: Array<{
    close: () => Promise<void>;
  }> = [];

  constructor(
    @Inject(ServiceBusClient) private readonly client: ServiceBusClient | null,
  ) {}

  isEnabled(): boolean {
    return Boolean(this.client);
  }

  private getSender(queueOrTopicName: string): ServiceBusSender {
    if (!this.client) {
      throw new Error(
        'Service Bus desabilitado (ServiceBusClient=null). Verifique SERVICE_BUS_ENABLED e SERVICE_BUS_CONNECTION_STRING.',
      );
    }
    const existing = this.senders.get(queueOrTopicName);
    if (existing) return existing;
    const sender = this.client.createSender(queueOrTopicName);
    this.senders.set(queueOrTopicName, sender);
    return sender;
  }

  async publish<TBody extends Record<string, any>>(
    queueOrTopicName: string,
    body: TBody,
    options?: { subject?: string },
  ) {
    if (!this.client) {
      this.logger.warn(
        `publish ignorado (SB desabilitado). Destino="${queueOrTopicName}".`,
      );
      return;
    }
    const sender = this.getSender(queueOrTopicName);
    await sender.sendMessages({
      body,
      contentType: 'application/json',
      subject: options?.subject,
    });
  }

  /**
   * Cria um receiver com handlers (útil para "consumer" em background).
   * O lock-renew e maxConcurrentCalls podem ser ajustados conforme o seu caso.
   */
  createQueueProcessor(params: {
    queueName: string;
    onMessage: (message: ServiceBusReceivedMessage) => Promise<void>;
    onError?: (err: Error) => void;
    maxConcurrentCalls?: number;
    maxAutoLockRenewalMs?: number;
  }): void {
    if (!this.client) {
      this.logger.warn(
        `createQueueProcessor ignorado (SB desabilitado). Fila="${params.queueName}".`,
      );
      return;
    }
    const receiver = this.client.createReceiver(params.queueName);
    const subscription = receiver.subscribe(
      {
        processMessage: async (message) => {
          await params.onMessage(message);
          await receiver.completeMessage(message);
        },
        processError: (args) => {
          this.logger.error(
            `Erro no receiver da fila "${params.queueName}": ${args.error?.message ?? args.error}`,
            args.error?.stack,
          );
          params.onError?.(args.error as Error);
          return Promise.resolve();
        },
      },
      {
        // mantém o comportamento explícito de completar a mensagem após o handler
        autoCompleteMessages: false,
        maxConcurrentCalls: params.maxConcurrentCalls ?? 10,
      },
    );

    this.receivers.push(receiver);
    this.receiverSubscriptions.push(subscription);
  }

  async onApplicationShutdown() {
    for (const sub of this.receiverSubscriptions) {
      try {
        await sub.close();
      } catch {
        // ignore
      }
    }
    for (const receiver of this.receivers) {
      try {
        await receiver.close();
      } catch {
        // ignore
      }
    }
    for (const sender of this.senders.values()) {
      try {
        await sender.close();
      } catch {
        // ignore
      }
    }
    if (this.client) {
      await this.client.close();
    }
  }
}
