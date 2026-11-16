import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HubspotService } from './hubspot.service';

describe('HubspotService', () => {
  let fetchMock: jest.SpyInstance;
  let service: HubspotService;
  let config: ConfigService;

  const emptyResponse = { total: 0, results: [] };

  function respond(body: unknown = emptyResponse, status = 200) {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }));
  }

  function requestBody() {
    const [, options] = fetchMock.mock.calls[0] as [URL, RequestInit];
    return JSON.parse(options.body as string) as Record<string, any>;
  }

  beforeEach(() => {
    config = new ConfigService({ HUBSPOT_ACCESS_TOKEN: 'test-hubspot-secret' });
    config.skipProcessEnv = true;
    service = new HubspotService(config);
    fetchMock = jest.spyOn(globalThis, 'fetch');
    respond();
  });

  afterEach(() => jest.restoreAllMocks());

  it('queries contacts without implicitly filtering lifecycle and maps the next cursor', async () => {
    respond({
      total: 51,
      results: [
        {
          id: '42',
          properties: {
            firstname: ' Maria ',
            lastname: 'Silva',
            email: 'maria@example.com',
            phone: '+5511999999999',
            lifecyclestage: 'customer',
            hs_lead_status: 'CONNECTED',
            hubspot_owner_id: '7',
            hs_analytics_source: 'PAID_SEARCH',
            createdate: '2026-11-01T12:00:00Z',
            lastmodifieddate: '2026-11-02T12:00:00Z',
          },
        },
      ],
      paging: { next: { after: '50' } },
    });

    const result = await service.listLeads({});

    const [url, options] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe(
      'https://api.hubapi.com/crm/v3/objects/contacts/search',
    );
    expect(options).toMatchObject({
      method: 'POST',
      redirect: 'error',
      headers: { Authorization: 'Bearer test-hubspot-secret' },
    });
    expect(requestBody()).toMatchObject({
      limit: 50,
      properties: expect.arrayContaining(['lifecyclestage', 'hs_lead_status']),
      sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
    });
    expect(requestBody()).not.toHaveProperty('filterGroups');
    expect(result.items[0]).toMatchObject({
      id: '42',
      name: 'Maria Silva',
      email: 'maria@example.com',
      lifecyclestage: 'customer',
      hs_lead_status: 'CONNECTED',
      created_at: '2026-11-01T12:00:00Z',
      updated_at: '2026-11-02T12:00:00Z',
      company: null,
      mobilephone: null,
    });
    expect(result.meta).toEqual({
      total_items: 51,
      limit: 50,
      next_after: '50',
      has_more: true,
      results_limited: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('combines creation dates, exact filters and native text search with AND semantics', async () => {
    await service.listLeads({
      start_date: '2026-11-01',
      end_date: '2026-11-03',
      limit: 100,
      after: 100,
      lifecyclestage: 'lead',
      hs_lead_status: 'NEW',
      email: 'maria@example.com',
      q: 'Maria',
    });

    expect(requestBody()).toMatchObject({
      limit: 100,
      after: 100,
      query: 'Maria',
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'createdate',
              operator: 'GTE',
              value: String(Date.parse('2026-11-01T00:00:00.000Z')),
            },
            {
              propertyName: 'createdate',
              operator: 'LTE',
              value: String(Date.parse('2026-11-03T23:59:59.999Z')),
            },
            { propertyName: 'lifecyclestage', operator: 'EQ', value: 'lead' },
            { propertyName: 'hs_lead_status', operator: 'EQ', value: 'NEW' },
            {
              propertyName: 'email',
              operator: 'EQ',
              value: 'maria@example.com',
            },
          ],
        },
      ],
    });
  });

  it('respects explicit timezone offsets and a one-sided date range', async () => {
    await service.listLeads({ start_date: '2026-11-01T00:00:00-03:00' });
    expect(requestBody().filterGroups).toEqual([
      {
        filters: [
          {
            propertyName: 'createdate',
            operator: 'GTE',
            value: String(Date.parse('2026-11-01T03:00:00Z')),
          },
        ],
      },
    ]);
  });

  it('returns nulls for absent contact fields and uses record timestamp fallbacks', async () => {
    respond({
      total: 1,
      results: [{ id: '1', properties: {}, createdAt: '2026-11-01T00:00:00Z' }],
    });
    const result = await service.listLeads({});
    expect(result.items[0]).toMatchObject({
      id: '1',
      name: null,
      email: null,
      phone: null,
      lifecyclestage: null,
      created_at: '2026-11-01T00:00:00Z',
      updated_at: null,
    });
    expect(result.meta.next_after).toBeNull();
    expect(result.meta.has_more).toBe(false);
  });

  it('marks searches over 10000 results and never exposes an unusable next cursor', async () => {
    respond({
      total: 15000,
      results: [],
      paging: { next: { after: '10000' } },
    });
    const result = await service.listLeads({ after: 9950, limit: 200 });
    expect(requestBody().limit).toBe(50);
    expect(result.meta).toMatchObject({
      total_items: 15000,
      limit: 50,
      next_after: null,
      has_more: false,
      results_limited: true,
    });
  });

  it('returns an empty list with total zero', async () => {
    expect(await service.listLeads({})).toEqual({
      items: [],
      meta: {
        total_items: 0,
        limit: 50,
        next_after: null,
        has_more: false,
        results_limited: false,
      },
    });
  });

  it.each([
    { start_date: '2026-11-04', end_date: '2026-11-03' },
    { start_date: '2026-02-30' },
  ])(
    'rejects invalid periods before making an upstream request (%j)',
    async (query) => {
      await expect(service.listLeads(query)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('allows startup without a token and reports missing configuration only on query', async () => {
    config.set('HUBSPOT_ACCESS_TOKEN', '');
    await expect(service.listLeads({})).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['HUBSPOT_BASE_URL', 'http://api.hubapi.com'],
    ['HUBSPOT_BASE_URL', 'https://user:password@api.hubapi.com'],
    ['HUBSPOT_REQUEST_TIMEOUT_MS', 'invalid'],
  ])('rejects invalid configuration for %s', async (key, value) => {
    config.set(key, value);
    await expect(service.listLeads({})).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [400, 400],
    [401, 502],
    [403, 502],
    [429, 429],
    [500, 503],
  ])(
    'maps HubSpot HTTP %i to HTTP %i without exposing upstream content',
    async (upstreamStatus, expectedStatus) => {
      respond(
        { message: 'test-hubspot-secret private-contact@example.com' },
        upstreamStatus,
      );
      try {
        await service.listLeads({});
        throw new Error('Expected the request to fail');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(expectedStatus);
        expect((error as Error).message).not.toContain('test-hubspot-secret');
        expect((error as Error).message).not.toContain(
          'private-contact@example.com',
        );
      }
    },
  );

  it.each([
    { results: [] },
    { total: 0, results: null },
    { total: 1, results: [{ id: '1', properties: { firstname: {} } }] },
  ])('rejects malformed successful responses (%j)', async (body) => {
    respond(body);
    await expect(service.listLeads({})).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('sanitizes connection and JSON parsing failures', async () => {
    fetchMock.mockRejectedValueOnce(new Error('private-network-details'));
    await expect(service.listLeads({})).rejects.toThrow(
      'Nao foi possivel consultar o HubSpot.',
    );
    fetchMock.mockResolvedValueOnce(new Response('<html>unavailable</html>'));
    await expect(service.listLeads({})).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('aborts slow upstream requests and returns a gateway timeout', async () => {
    config.set('HUBSPOT_REQUEST_TIMEOUT_MS', '5');
    fetchMock.mockImplementationOnce(
      (_url: URL, options: RequestInit) =>
        new Promise((_resolve, reject) => {
          options.signal?.addEventListener(
            'abort',
            () => reject(new Error('aborted')),
            { once: true },
          );
        }),
    );
    await expect(service.listLeads({})).rejects.toBeInstanceOf(
      GatewayTimeoutException,
    );
  });
});
