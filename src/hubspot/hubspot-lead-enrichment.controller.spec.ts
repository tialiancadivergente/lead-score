import {
  BadGatewayException,
  GatewayTimeoutException,
  INestApplication,
  ServiceUnavailableException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DatabricksService } from '../databricks/databricks.service';
import { HubspotModule } from './hubspot.module';

describe('GET /hubspot/leads/ally', () => {
  let app: INestApplication<App>;
  let fetchMock: jest.SpyInstance;
  const executeQuery = jest.fn();
  const settings: Record<string, string | undefined> = {
    API_KEY_ENABLED: 'true',
    INTERNAL_API_KEY: 'test-api-key',
    HUBSPOT_ACCESS_TOKEN: 'test-hubspot-token',
  };
  const path = '/hubspot/leads/ally';

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [HubspotModule] })
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
    fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ total: 0, results: [] })),
      );
    executeQuery.mockReset().mockResolvedValue([]);
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await app.close();
  });

  const get = (query: Record<string, string> = {}) =>
    request(app.getHttpServer())
      .get(path)
      .query(query)
      .set('x-api-key', 'test-api-key');
  function contacts(
    emails: Array<string | null>,
    total = emails.length,
    after?: string,
  ) {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          total,
          results: emails.map((email, index) => ({
            id: String(index + 1),
            properties: {
              email,
              firstname: 'Lead',
              lastname: String(index + 1),
              lifecyclestage: 'lead',
              hs_lead_status: 'NEW',
            },
          })),
          ...(after ? { paging: { next: { after } } } : {}),
        }),
      ),
    );
  }

  it('adds a boolean to every lead while preserving fields, order, total and cursor', async () => {
    contacts(
      [' A@Example.com ', 'other@example.com', null, '', 'a@example.com'],
      101,
      '100',
    );
    executeQuery.mockResolvedValue([{ email: 'a@example.com' }]);
    const response = await get({
      limit: '50',
      after: '50',
      sort_by: 'updated_at',
      order: 'asc',
      start_date: '2026-11-01',
      end_date: '2026-11-04',
    })
      .expect(200)
      .expect('Cache-Control', 'private, no-store');
    expect(
      response.body.items.map((item: { id: string; ex_aliado: boolean }) => [
        item.id,
        item.ex_aliado,
      ]),
    ).toEqual([
      ['1', true],
      ['2', false],
      ['3', false],
      ['4', false],
      ['5', true],
    ]);
    expect(response.body.items[0]).toMatchObject({
      name: 'Lead 1',
      email: ' A@Example.com ',
      lifecyclestage: 'lead',
      hs_lead_status: 'NEW',
    });
    expect(response.body.meta).toEqual({
      total_items: 101,
      limit: 50,
      next_after: '100',
      has_more: true,
      results_limited: false,
    });
    expect(executeQuery).toHaveBeenCalledTimes(1);
    expect(executeQuery.mock.calls[0][1]).toEqual({
      email_0: 'a@example.com',
      email_1: 'other@example.com',
    });
    const [, options] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(JSON.parse(options.body as string)).toMatchObject({
      after: 50,
      sorts: [{ propertyName: 'lastmodifieddate', direction: 'ASCENDING' }],
      filterGroups: [
        {
          filters: expect.arrayContaining([
            expect.objectContaining({
              propertyName: 'createdate',
              operator: 'GTE',
            }),
            expect.objectContaining({
              propertyName: 'createdate',
              operator: 'LTE',
            }),
          ]),
        },
      ],
    });
    expect(executeQuery.mock.calls[0][0]).not.toContain('2026-11');
  });

  it('returns false when there is no qualifying order', async () => {
    contacts(['lead@example.com']);
    const response = await get().expect(200);
    expect(response.body.items[0].ex_aliado).toBe(false);
    expect(executeQuery).toHaveBeenCalledTimes(1);
  });

  it.each([{ emails: [] }, { emails: [null, '', '  '] }])(
    'skips Databricks when the page has no emails (%j)',
    async ({ emails }) => {
      contacts(emails);
      const response = await get().expect(200);
      expect(
        response.body.items.every(
          (item: { ex_aliado: boolean }) => item.ex_aliado === false,
        ),
      ).toBe(true);
      expect(executeQuery).not.toHaveBeenCalled();
    },
  );

  it.each(['true', 'false'])(
    'requires only a valid x-api-key (global flag %s)',
    async (enabled) => {
      settings.API_KEY_ENABLED = enabled;
      await request(app.getHttpServer()).get(path).expect(401);
      await request(app.getHttpServer())
        .get(path)
        .set('x-api-key', 'wrong-key')
        .expect(401);
      expect(fetchMock).not.toHaveBeenCalled();
      await get().expect(200);
    },
  );

  it.each([
    { sort_by: 'invalid' },
    { order: 'invalid' },
    { limit: '201' },
    { after: '10000' },
    { email: 'invalid' },
  ])(
    'validates query parameters before querying sources (%j)',
    async (query) => {
      await get(query).expect(400);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(executeQuery).not.toHaveBeenCalled();
    },
  );

  it.each([
    [new BadGatewayException('Data lake indisponivel.'), 502],
    [new ServiceUnavailableException('Configuracao ausente.'), 503],
    [new GatewayTimeoutException('Tempo excedido.'), 504],
  ])(
    'propagates a data lake failure rather than returning false (%p)',
    async (error, status) => {
      contacts(['lead@example.com']);
      executeQuery.mockRejectedValue(error);
      const response = await get().expect(status);
      expect(response.body).not.toHaveProperty('items');
    },
  );

  it('does not query Databricks when HubSpot fails', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 503 }));
    await get().expect(503);
    expect(executeQuery).not.toHaveBeenCalled();
  });

  it('keeps the original endpoint free of data lake calls or new fields', async () => {
    contacts(['lead@example.com']);
    const response = await request(app.getHttpServer())
      .get('/hubspot/leads')
      .set('x-api-key', 'test-api-key')
      .expect(200);
    expect(response.body.items[0]).not.toHaveProperty('ex_aliado');
    expect(executeQuery).not.toHaveBeenCalled();
  });
});
