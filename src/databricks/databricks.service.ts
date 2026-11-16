import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DBSQLClient } from '@databricks/sql';

type SqlSession = Awaited<ReturnType<DBSQLClient['openSession']>>;
type SqlOperation = Awaited<ReturnType<SqlSession['executeStatement']>>;

@Injectable()
export class DatabricksService {
  private readonly logger = new Logger(DatabricksService.name);

  constructor(private readonly config: ConfigService) {}

  async executeQuery<T>(
    query: string,
    parameters?: Record<string, string | number>,
  ): Promise<T[]> {
    const host = this.requiredConfig('DATABRICKS_HOST');
    const path = this.requiredConfig('DATABRICKS_HTTP_PATH');
    const token = this.requiredConfig('DATABRICKS_TOKEN');
    const timeout = Number(
      this.config.get<string>('DATABRICKS_TIMEOUT_MS', '120000'),
    );
    if (!/^[a-z\d.-]+$/i.test(host) || !path.startsWith('/sql/')) {
      throw new ServiceUnavailableException(
        'Configuracao de host ou HTTP path do Databricks invalida.',
      );
    }
    if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 600_000) {
      throw new ServiceUnavailableException(
        'DATABRICKS_TIMEOUT_MS deve estar entre 1 e 600000.',
      );
    }

    // Uma conexao por consulta evita compartilhar sessoes entre requisicoes concorrentes.
    // O logger do driver pode incluir SQL/dados de conexao; registre apenas erros sanitizados.
    const client = new DBSQLClient({ logger: { log: () => undefined } });
    let session: SqlSession | undefined;
    let operation: SqlOperation | undefined;
    const deadline = Date.now() + timeout;
    const remaining = () => Math.max(1, deadline - Date.now());

    try {
      await this.withTimeout(
        client.connect({ host, path, token, socketTimeout: timeout }),
        remaining(),
        () => client.close(),
      );
      session = await this.withTimeout(
        client.openSession({
          configuration: {
            STATEMENT_TIMEOUT: String(Math.ceil(timeout / 1000)),
          },
        }),
        remaining(),
        (lateSession) => lateSession.close(),
      );
      operation = await this.withTimeout(
        session.executeStatement(query, { namedParameters: parameters }),
        remaining(),
        (lateOperation) => lateOperation.close(),
      );
      return (await this.withTimeout(operation.fetchAll(), remaining())) as T[];
    } catch (error) {
      if (error instanceof GatewayTimeoutException) throw error;
      this.logger.warn('Falha ao consultar o Databricks.');
      throw new BadGatewayException(
        'Nao foi possivel consultar o data lake. Verifique acesso, token e disponibilidade do Databricks.',
      );
    } finally {
      await this.cleanup(async () =>
        Promise.allSettled([
          ...(operation ? [operation.close()] : []),
          ...(session ? [session.close()] : []),
          client.close(),
        ]),
      );
    }
  }

  private requiredConfig(name: string): string {
    const value = this.config.get<string>(name)?.trim();
    if (!value) {
      throw new ServiceUnavailableException(
        `Databricks nao configurado. Defina ${name} no backend.`,
      );
    }
    return value;
  }

  private withTimeout<T>(
    promise: Promise<T>,
    timeout: number,
    onLateResolve?: (value: T) => Promise<unknown>,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      let expired = false;
      const timer = setTimeout(() => {
        expired = true;
        reject(
          new GatewayTimeoutException(
            'Tempo de consulta ao Databricks excedido.',
          ),
        );
      }, timeout);
      promise.then(
        (value) => {
          clearTimeout(timer);
          if (expired) {
            if (onLateResolve) void this.cleanup(() => onLateResolve(value));
          } else resolve(value);
        },
        (error: unknown) => {
          clearTimeout(timer);
          reject(
            error instanceof Error
              ? error
              : new Error('Falha no driver Databricks.'),
          );
        },
      );
    });
  }

  private async cleanup(action: () => Promise<unknown>): Promise<void> {
    try {
      await this.withTimeout(Promise.resolve().then(action), 5000);
    } catch {
      this.logger.warn(
        'Nao foi possivel concluir o fechamento de recursos do Databricks.',
      );
    }
  }
}
