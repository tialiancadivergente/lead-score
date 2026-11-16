import {
  BadGatewayException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DatabricksService } from '../databricks/databricks.service';
import { PedidosModule } from './pedidos.module';

describe('GET /pedidos', () => {
  let app: INestApplication<App>;
  const executeQuery = jest.fn();
  const settings: Record<string, string | undefined> = {
    API_KEY_ENABLED: 'true',
    INTERNAL_API_KEY: 'test-api-key',
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [PedidosModule] })
      .overrideProvider(DatabricksService)
      .useValue({ executeQuery })
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string, fallback?: string) => settings[key] ?? fallback,
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });
  beforeEach(() => {
    settings.API_KEY_ENABLED = 'true';
    executeQuery
      .mockReset()
      .mockResolvedValue([{ total: 0, tem_registro: null, registro: null }]);
  });
  afterAll(async () => {
    await app.close();
  });

  const get = (query: Record<string, string> = {}) =>
    request(app.getHttpServer())
      .get('/pedidos')
      .query(query)
      .set('x-api-key', 'test-api-key');

  it('preserves all source columns and adds the complete customer with only x-api-key', async () => {
    const registro = {
      id: 1,
      cliente_id: 123,
      pedido_status: 2,
      campo_novo: 'preservado',
      campo_nulo: null,
      total: 'coluna da origem',
      tem_registro: false,
    };
    const cliente = {
      id: 123,
      pessoa_nome: 'Teste',
      pessoa_email: 'teste@example.com',
      campo_adicional: null,
    };
    executeQuery.mockResolvedValue([
      { total: 1, tem_registro: true, registro, cliente },
    ]);
    const response = await get()
      .expect(200)
      .expect('Cache-Control', 'no-store');
    expect(response.body.data).toEqual([{ ...registro, cliente }]);
    expect(response.body.pagination).toEqual({
      page: 1,
      limit: 50,
      total: 1,
      totalPages: 1,
      hasNext: false,
    });
    expect(Number.isNaN(Date.parse(response.body.consultadoEm as string))).toBe(
      false,
    );
    const [sql, parameters] = executeQuery.mock.calls[0] as [string, object];
    expect(sql).toContain('data_lake_imperio.default.pedidosdlt');
    expect(sql).toContain('data_lake_imperio.default.pessoasdlt');
    expect(sql).toContain(
      'LEFT JOIN clientes c ON c.id = pagina.registro.cliente_id',
    );
    expect(sql).toContain('ORDER BY t.criado DESC NULLS LAST, t.id DESC');
    expect(sql).toContain('LIMIT :limit OFFSET :offset');
    expect(parameters).toEqual({ limit: 50, offset: 0 });
    expect(executeQuery).toHaveBeenCalledTimes(1);
  });

  it('paginates orders and keeps orders with no customer', async () => {
    executeQuery.mockResolvedValue([
      { total: '5', tem_registro: true, registro: { id: 3, cliente_id: null } },
      {
        total: '5',
        tem_registro: true,
        registro: { id: 4, cliente_id: 999 },
        cliente: null,
      },
    ]);
    const response = await get({ page: '2', limit: '2' }).expect(200);
    expect(response.body.data).toEqual([
      { id: 3, cliente_id: null, cliente: null },
      { id: 4, cliente_id: 999, cliente: null },
    ]);
    expect(response.body.pagination).toEqual({
      page: 2,
      limit: 2,
      total: 5,
      totalPages: 3,
      hasNext: true,
    });
    expect(executeQuery.mock.calls[0][1]).toEqual({ limit: 2, offset: 2 });
  });

  it.each([0, 5])('preserves total %s for an empty page', async (total) => {
    executeQuery.mockResolvedValue([
      { total, tem_registro: null, registro: null },
    ]);
    const response = await get({ page: '4', limit: '2' }).expect(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.pagination).toMatchObject({
      total,
      totalPages: Math.ceil(total / 2),
      hasNext: false,
    });
  });

  it('serializes nested binaries, timestamps and big integers without losing precision', async () => {
    executeQuery.mockResolvedValue([
      {
        total: 1n,
        tem_registro: true,
        registro: {
          id: 9007199254740993n,
          criado: new Date('2026-10-28T12:00:00Z'),
          adicional: { valores: [null, Buffer.from('teste')] },
        },
        cliente: { avatar: Buffer.from([0, 1, 2, 255]) },
      },
    ]);
    const response = await get().expect(200);
    expect(response.body.data).toEqual([
      {
        id: '9007199254740993',
        criado: '2026-10-28T12:00:00.000Z',
        adicional: { valores: [null, 'dGVzdGU='] },
        cliente: { avatar: 'AAEC/w==' },
      },
    ]);
  });

  it.each(['true', 'false'])(
    'always requires the internal API key (global flag %s)',
    async (enabled) => {
      settings.API_KEY_ENABLED = enabled;
      await request(app.getHttpServer()).get('/pedidos').expect(401);
      await request(app.getHttpServer())
        .get('/pedidos')
        .set('x-api-key', 'wrong-key')
        .expect(401);
      expect(executeQuery).not.toHaveBeenCalled();
    },
  );

  it.each([
    { page: '0' },
    { page: '-1' },
    { page: '1.5' },
    { page: 'abc' },
    { limit: '0' },
    { limit: '101' },
    { limit: '1.5' },
    { page: '9007199254740992' },
    { page: '9007199254740991', limit: '100' },
    { limit: '1 OR 1=1' },
    { table: 'other-table' },
  ])(
    'rejects invalid pagination before querying the lake (%j)',
    async (query) => {
      await get(query).expect(400);
      expect(executeQuery).not.toHaveBeenCalled();
    },
  );

  it('returns sanitized gateway errors from the Databricks service', async () => {
    executeQuery.mockRejectedValue(
      new BadGatewayException('Nao foi possivel consultar o data lake.'),
    );
    await get().expect(502);
  });
});
