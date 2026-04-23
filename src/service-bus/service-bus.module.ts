import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServiceBusClient } from '@azure/service-bus';
import { ServiceBusService } from './service-bus.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: ServiceBusClient,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const enabled =
          config.get<string>('SERVICE_BUS_ENABLED', 'false') === 'true';
        if (!enabled) {
          // Service Bus desabilitado: não cria client (ServiceBusService vira no-op)
          return null;
        }

        const connectionString = config.get<string>(
          'SERVICE_BUS_CONNECTION_STRING',
        );
        if (!connectionString) {
          // Mantém o app subindo mesmo sem SB configurado
          return null;
        }

        return new ServiceBusClient(connectionString, {
          retryOptions: {
            maxRetries: Number(
              config.get<string>('SERVICE_BUS_MAX_RETRIES', '5'),
            ),
            retryDelayInMs: Number(
              config.get<string>('SERVICE_BUS_RETRY_DELAY_MS', '200'),
            ),
            maxRetryDelayInMs: Number(
              config.get<string>('SERVICE_BUS_MAX_RETRY_DELAY_MS', '5000'),
            ),
          },
        });
      },
    },
    ServiceBusService,
  ],
  exports: [ServiceBusService],
})
export class ServiceBusModule {}
