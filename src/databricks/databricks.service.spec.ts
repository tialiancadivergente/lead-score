import {
  BadGatewayException,
  GatewayTimeoutException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DBSQLClient } from '@databricks/sql';
import { DatabricksService } from './databricks.service';

jest.mock('@databricks/sql', () => ({ DBSQLClient: jest.fn() }));

function resources() {
  const operation = {
    fetchAll: jest.fn().mockResolvedValue([{ id: 1 }]),
    close: jest.fn().mockResolvedValue(undefined),
  };
  const session = {
    executeStatement: jest.fn().mockResolvedValue(operation),
    close: jest.fn().mockResolvedValue(undefined),
  };
  const client = {
    connect: jest.fn().mockResolvedValue(undefined),
    openSession: jest.fn().mockResolvedValue(session),
    close: jest.fn().mockResolvedValue(undefined),
  };
  return { client, session, operation };
}

describe('DatabricksService', () => {
  let service: DatabricksService;
  let settings: Record<string, string | undefined>;
  let db: ReturnType<typeof resources>;

  beforeEach(() => {
    settings = {
      DATABRICKS_HOST: 'example.azuredatabricks.net',
      DATABRICKS_HTTP_PATH: '/sql/1.0/warehouses/test',
      DATABRICKS_TOKEN: 'test-private-token',
      DATABRICKS_TIMEOUT_MS: '120000',
    };
    const config = new ConfigService(settings);
    config.skipProcessEnv = true;
    service = new DatabricksService(config);
    db = resources();
    jest
      .mocked(DBSQLClient)
      .mockReset()
      .mockImplementation(() => db.client as never);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('uses configured credentials, binds parameters and closes all resources', async () => {
    await expect(
      service.executeQuery('SELECT :limit', { limit: 50 }),
    ).resolves.toEqual([{ id: 1 }]);
    expect(db.client.connect).toHaveBeenCalledWith({
      host: settings.DATABRICKS_HOST,
      path: settings.DATABRICKS_HTTP_PATH,
      token: settings.DATABRICKS_TOKEN,
      socketTimeout: 120000,
    });
    expect(db.client.openSession).toHaveBeenCalledWith({
      configuration: { STATEMENT_TIMEOUT: '120' },
    });
    expect(db.session.executeStatement).toHaveBeenCalledWith('SELECT :limit', {
      namedParameters: { limit: 50 },
    });
    expect(db.operation.close).toHaveBeenCalledTimes(1);
    expect(db.session.close).toHaveBeenCalledTimes(1);
    expect(db.client.close).toHaveBeenCalledTimes(1);
  });

  it('isolates concurrent queries with separate clients and sessions', async () => {
    const other = resources();
    jest
      .mocked(DBSQLClient)
      .mockImplementationOnce(() => db.client as never)
      .mockImplementationOnce(() => other.client as never);
    await Promise.all([
      service.executeQuery('SELECT 1'),
      service.executeQuery('SELECT 2'),
    ]);
    expect(db.session.executeStatement).toHaveBeenCalledWith(
      'SELECT 1',
      expect.anything(),
    );
    expect(other.session.executeStatement).toHaveBeenCalledWith(
      'SELECT 2',
      expect.anything(),
    );
    expect(db.client.close).toHaveBeenCalledTimes(1);
    expect(other.client.close).toHaveBeenCalledTimes(1);
  });

  it.each(['DATABRICKS_HOST', 'DATABRICKS_HTTP_PATH', 'DATABRICKS_TOKEN'])(
    'reports missing %s only when queried',
    async (key) => {
      settings[key] = '';
      await expect(service.executeQuery('SELECT 1')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(DBSQLClient).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['DATABRICKS_HOST', 'https://example.com'],
    ['DATABRICKS_HTTP_PATH', '/invalid'],
    ['DATABRICKS_TIMEOUT_MS', 'NaN'],
    ['DATABRICKS_TIMEOUT_MS', '0'],
    ['DATABRICKS_TIMEOUT_MS', '600001'],
  ])('validates configuration %s=%s', async (key, value) => {
    settings[key] = value;
    await expect(service.executeQuery('SELECT 1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(DBSQLClient).not.toHaveBeenCalled();
  });

  it.each(['connect', 'openSession', 'executeStatement', 'fetchAll'])(
    'sanitizes failure during %s and closes acquired resources',
    async (stage) => {
      const failure = new Error(
        'test-private-token private-person@example.com',
      );
      if (stage === 'connect') db.client.connect.mockRejectedValueOnce(failure);
      if (stage === 'openSession')
        db.client.openSession.mockRejectedValueOnce(failure);
      if (stage === 'executeStatement')
        db.session.executeStatement.mockRejectedValueOnce(failure);
      if (stage === 'fetchAll')
        db.operation.fetchAll.mockRejectedValueOnce(failure);
      const pending = service.executeQuery('SELECT 1');
      await expect(pending).rejects.toBeInstanceOf(BadGatewayException);
      await expect(pending).rejects.not.toThrow('test-private-token');
      expect(db.client.close).toHaveBeenCalled();
      if (stage === 'executeStatement' || stage === 'fetchAll')
        expect(db.session.close).toHaveBeenCalled();
      if (stage === 'fetchAll') expect(db.operation.close).toHaveBeenCalled();
    },
  );

  it('enforces a total deadline and closes an operation that resolves after timeout', async () => {
    jest.useFakeTimers();
    settings.DATABRICKS_TIMEOUT_MS = '20';
    let resolveOperation!: (operation: unknown) => void;
    db.session.executeStatement.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOperation = resolve;
        }),
    );
    const pending = expect(
      service.executeQuery('SELECT 1'),
    ).rejects.toBeInstanceOf(GatewayTimeoutException);
    await jest.advanceTimersByTimeAsync(20);
    await pending;
    expect(db.session.close).toHaveBeenCalled();
    expect(db.client.close).toHaveBeenCalled();
    resolveOperation(db.operation);
    await jest.advanceTimersByTimeAsync(0);
    expect(db.operation.close).toHaveBeenCalled();
    expect(db.operation.fetchAll).not.toHaveBeenCalled();
  });

  it('does not mask a successful query when closing resources fails', async () => {
    db.operation.close.mockRejectedValueOnce(new Error('close failed'));
    db.session.close.mockRejectedValueOnce(new Error('close failed'));
    db.client.close.mockRejectedValueOnce(new Error('close failed'));
    await expect(service.executeQuery('SELECT 1')).resolves.toEqual([
      { id: 1 },
    ]);
  });
});
