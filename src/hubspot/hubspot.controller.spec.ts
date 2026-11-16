import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { HubspotController } from './hubspot.controller';
import { HubspotService } from './hubspot.service';
import { HubspotLeadEnrichmentService } from './hubspot-lead-enrichment.service';

describe('HubspotController HTTP contract', () => {
  let app: INestApplication<App>;
  let fetchMock: jest.SpyInstance;
  const settings: Record<string, string | undefined> = {
    API_KEY_ENABLED: 'true',
    INTERNAL_API_KEY: 'test-api-key',
    HUBSPOT_ACCESS_TOKEN: 'test-hubspot-token',
  };
  const config = {
    get: (key: string, fallback?: string) => settings[key] ?? fallback,
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [HubspotController],
      providers: [
        HubspotService,
        {
          provide: HubspotLeadEnrichmentService,
          useValue: { listLeads: jest.fn() },
        },
        ApiKeyGuard,
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
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
    settings.INTERNAL_API_KEY = 'test-api-key';
    fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ total: 0, results: [] })),
      );
  });

  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await app.close();
  });

  const getLeads = (query: Record<string, string> = {}) =>
    request(app.getHttpServer())
      .get('/hubspot/leads')
      .query(query)
      .set('x-api-key', 'test-api-key');

  it('serves the route with only x-api-key and transforms pagination parameters', async () => {
    await getLeads({ limit: '100', after: '50', start_date: '2026-11-01' })
      .expect(200)
      .expect('Cache-Control', 'private, no-store')
      .expect({
        items: [],
        meta: {
          total_items: 0,
          limit: 100,
          next_after: null,
          has_more: false,
          results_limited: false,
        },
      });
    const [, options] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(JSON.parse(options.body as string)).toMatchObject({
      limit: 100,
      after: 50,
    });
  });

  it.each([
    ['created_at', 'asc', 'createdate', 'ASCENDING'],
    ['created_at', 'desc', 'createdate', 'DESCENDING'],
    ['updated_at', 'asc', 'lastmodifieddate', 'ASCENDING'],
    ['updated_at', 'desc', 'lastmodifieddate', 'DESCENDING'],
  ])(
    'passes sort_by=%s and order=%s to HubSpot',
    async (sort_by, order, propertyName, direction) => {
      await getLeads({ sort_by, order, after: '50' }).expect(200);
      const [, options] = fetchMock.mock.calls[0] as [URL, RequestInit];
      expect(JSON.parse(options.body as string)).toMatchObject({
        sorts: [{ propertyName, direction }],
        after: 50,
      });
    },
  );

  it.each(['true', 'false'])(
    'requires x-api-key when API_KEY_ENABLED=%s',
    async (enabled) => {
      settings.API_KEY_ENABLED = enabled;
      await request(app.getHttpServer()).get('/hubspot/leads').expect(401);
      await request(app.getHttpServer())
        .get('/hubspot/leads')
        .set('x-api-key', 'wrong-key')
        .expect(401);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('accepts a valid key when the global API key flag is disabled', async () => {
    settings.API_KEY_ENABLED = 'false';
    await getLeads().expect(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not accept Authorization as a substitute for x-api-key', async () => {
    await request(app.getHttpServer())
      .get('/hubspot/leads')
      .set('Authorization', 'Bearer some-token')
      .expect(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects requests when the internal key is not configured', async () => {
    settings.INTERNAL_API_KEY = undefined;
    await getLeads().expect(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    { sort_by: 'invalid' },
    { sort_by: '' },
    { order: 'invalid' },
    { order: '' },
    { limit: '0' },
    { limit: '201' },
    { limit: '1.5' },
    { limit: 'NaN' },
    { after: '-1' },
    { after: '10000' },
    { after: 'abc' },
    { start_date: '2026-02-30' },
    { start_date: '2026-11-01T12:00:00' },
    { end_date: 'not-a-date' },
    { start_date: '2026-11-04', end_date: '2026-11-03' },
    { email: 'invalid' },
    { token: 'never-accept-a-provider-token-in-query' },
  ])(
    'rejects invalid query parameters without calling HubSpot (%j)',
    async (query) => {
      await getLeads(query).expect(400);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});
