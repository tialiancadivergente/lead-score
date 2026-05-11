import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, In, Repository } from 'typeorm';
import { HotmartSaleRaw } from '../database/entities/hotmart/hotmart-sale-raw.entity';
import { HotmartSale } from '../database/entities/hotmart/hotmart-sale.entity';
import { ServiceBusService } from '../service-bus/service-bus.service';
import { HotmartProcessorService } from './hotmart-processor.service';

// Configuração Hotmart — Aliança Divergente (conta principal)
const HOTMART_HOTTOK =
  process.env.HOTMART_HOTTOK ??
  'ZhMW4cXUq6LEQxoDAjwtjAVB1m6neGc49e10a0-0170-4693-b986-c1440cc9c175';
const HOTMART_CLIENT_ID =
  process.env.HOTMART_CLIENT_ID ?? '7a56ff06-0cde-44ee-be48-90e79c589bc6';
const HOTMART_CLIENT_SECRET =
  process.env.HOTMART_CLIENT_SECRET ?? 'b796b72c-1d3f-443d-a1e1-2c467806092d';
const HOTMART_SOURCE_ACCOUNT =
  process.env.HOTMART_SOURCE_ACCOUNT ?? 'alianca_divergente';
const HOTMART_SANDBOX = process.env.HOTMART_SANDBOX === 'true';
const HOTMART_API_BASE = HOTMART_SANDBOX
  ? 'https://sandbox.hotmart.com/payments/api/v1'
  : 'https://developers.hotmart.com/payments/api/v1';
const HOTMART_TOKEN_URL = 'https://api-sec-vlc.hotmart.com/security/oauth/token';
const HOTMART_SALE_QUEUE = process.env.SERVICE_BUS_HOTMART_SALE_QUEUE ?? 'hotmart-sale-process';
const PROCESS_VIA_QUEUE = process.env.HOTMART_PROCESS_VIA_QUEUE === 'true';

@Injectable()
export class HotmartService {
  private readonly logger = new Logger(HotmartService.name);

  constructor(
    @InjectRepository(HotmartSaleRaw)
    private readonly rawRepo: Repository<HotmartSaleRaw>,
    @InjectRepository(HotmartSale)
    private readonly saleRepo: Repository<HotmartSale>,
    private readonly serviceBus: ServiceBusService,
    private readonly processor: HotmartProcessorService,
  ) {}

  // ── Webhook ───────────────────────────────────────────────────────────────

  validateHottok(incoming: string | undefined): void {
    if (!HOTMART_HOTTOK) {
      this.logger.warn('HOTMART_HOTTOK não configurado — validação ignorada');
      return;
    }
    if (!incoming || incoming !== HOTMART_HOTTOK) {
      throw new UnauthorizedException('Hottok inválido');
    }
  }

  async receiveWebhook(
    payload: Record<string, unknown>,
    hottok?: string,
  ): Promise<{ saved: boolean; id?: string; reason?: string }> {
    this.validateHottok(hottok);

    this.logger.log('=== HOTMART WEBHOOK RECEBIDO ===');
    this.logger.log(JSON.stringify(payload, null, 2));

    const { event, transactionCode, buyerEmail } = this.extractWebhookFields(payload);
    this.logger.log(
      `event=${event} transaction=${transactionCode ?? 'n/a'} email=${buyerEmail ?? 'n/a'}`,
    );

    return this.saveRawItem(event, transactionCode, buyerEmail, payload, HOTMART_SOURCE_ACCOUNT);
  }

  // ── Listagem raw ──────────────────────────────────────────────────────────

  listRaw(limit = 50): Promise<HotmartSaleRaw[]> {
    return this.rawRepo.find({ order: { created_at: 'DESC' }, take: limit });
  }

  // ── Sync histórico ────────────────────────────────────────────────────────

  async syncHistory(
    params: { startDate?: string; endDate?: string; transactionStatus?: string } = {},
  ): Promise<{ synced: number; skipped: number; message?: string }> {
    if (!HOTMART_CLIENT_ID || !HOTMART_CLIENT_SECRET) {
      return {
        synced: 0,
        skipped: 0,
        message: 'Configure HOTMART_CLIENT_ID e HOTMART_CLIENT_SECRET no .env',
      };
    }

    this.logger.log(`Iniciando sync histórico: ${JSON.stringify(params)}`);

    const token = await this.fetchAccessToken();
    let pageToken: string | undefined;
    let totalSaved = 0;
    let totalSkipped = 0;
    let page = 0;

    do {
      page++;
      const url = this.buildHistoryUrl(params, pageToken);
      this.logger.log(`Buscando página ${page}: ${url}`);

      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(`Erro na API Hotmart: status=${response.status} body=${body}`);
        break;
      }

      const json = (await response.json()) as Record<string, unknown>;
      const items = (json['items'] as Record<string, unknown>[] | undefined) ?? [];
      this.logger.log(`Página ${page}: ${items.length} itens`);

      const { saved, skipped } = await this.upsertPage(items);
      totalSaved += saved;
      totalSkipped += skipped;

      const pageInfo = json['page_info'] as Record<string, unknown> | undefined;
      pageToken = pageInfo?.['next_page_token'] as string | undefined;
    } while (pageToken);

    this.logger.log(`Sync concluído: saved=${totalSaved} skipped=${totalSkipped}`);
    return { synced: totalSaved, skipped: totalSkipped };
  }

  // ── Dashboard: vendas ─────────────────────────────────────────────────────

  async listSales(filters: {
    status?: string;
    productId?: number;
    sourceAccount?: string;
    personId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: HotmartSale[]; total: number }> {
    const { page = 1, limit = 20, status, productId, sourceAccount, personId, from, to } = filters;

    const qb = this.saleRepo
      .createQueryBuilder('s')
      .orderBy('s.order_date', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) qb.andWhere('s.purchase_status = :status', { status });
    if (productId) qb.andWhere('s.product_id = :productId', { productId });
    if (sourceAccount) qb.andWhere('s.source_account = :sourceAccount', { sourceAccount });
    if (personId) qb.andWhere('s.person_id = :personId', { personId });
    if (from) qb.andWhere('s.order_date >= :from', { from: new Date(from) });
    if (to) qb.andWhere('s.order_date <= :to', { to: new Date(to) });

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async getSalesSummary(filters: {
    from?: string;
    to?: string;
    sourceAccount?: string;
  }): Promise<{
    total_sales: number;
    total_revenue: number;
    by_status: Record<string, number>;
    by_product: { product_id: number; product_name: string; count: number; revenue: number }[];
  }> {
    const qb = this.saleRepo.createQueryBuilder('s');
    if (filters.from) qb.andWhere('s.order_date >= :from', { from: new Date(filters.from) });
    if (filters.to) qb.andWhere('s.order_date <= :to', { to: new Date(filters.to) });
    if (filters.sourceAccount) qb.andWhere('s.source_account = :sa', { sa: filters.sourceAccount });

    const [total, byStatus, byProduct, revenueRow] = await Promise.all([
      qb.clone().getCount(),
      qb.clone()
        .select('s.purchase_status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('s.purchase_status')
        .getRawMany<{ status: string; count: string }>(),
      qb.clone()
        .select('s.product_id', 'product_id')
        .addSelect('s.product_name', 'product_name')
        .addSelect('COUNT(*)', 'count')
        .addSelect('SUM(s.price)', 'revenue')
        .groupBy('s.product_id, s.product_name')
        .getRawMany<{ product_id: string; product_name: string; count: string; revenue: string }>(),
      qb.clone()
        .andWhere('s.purchase_status IN (:...statuses)', { statuses: ['APPROVED', 'COMPLETE'] })
        .select('SUM(s.price)', 'total')
        .getRawOne<{ total: string }>(),
    ]);

    return {
      total_sales: total,
      total_revenue: Number(revenueRow?.total ?? 0),
      by_status: Object.fromEntries(byStatus.map(r => [r.status ?? 'null', Number(r.count)])),
      by_product: byProduct.map(r => ({
        product_id: Number(r.product_id),
        product_name: r.product_name,
        count: Number(r.count),
        revenue: Number(r.revenue ?? 0),
      })),
    };
  }

  // ── Privados ──────────────────────────────────────────────────────────────

  private async saveRawItem(
    event: string | undefined,
    transactionCode: string | undefined,
    buyerEmail: string | undefined,
    payload: Record<string, unknown>,
    sourceAccount: string,
  ): Promise<{ saved: boolean; id?: string; reason?: string }> {
    if (transactionCode) {
      const existing = await this.rawRepo.findOne({
        where: { transaction_code: transactionCode },
        select: ['id', 'payload'],
      });

      if (existing) {
        const oldStatus = this.getPurchaseStatus(existing.payload);
        const newStatus = this.getPurchaseStatus(payload);

        if (oldStatus === newStatus) {
          this.logger.warn(`Duplicata ignorada (status=${newStatus ?? 'n/a'}): ${transactionCode}`);
          return { saved: false, reason: 'duplicate' };
        }

        this.logger.log(
          `Status alterado ${transactionCode}: ${oldStatus ?? 'n/a'} → ${newStatus ?? 'n/a'}`,
        );
        const rawFields = this.extractRawFields(payload);
        await this.rawRepo.update(existing.id, {
          event,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          payload: payload as any,
          import_status: 'pending',
          processed_at: undefined as unknown as Date,
          error: undefined,
          ...rawFields,
        });
        this.triggerProcessing(existing.id);
        return { saved: true, id: existing.id, reason: 'updated' };
      }
    }

    const rawFields = this.extractRawFields(payload);
    const raw = this.rawRepo.create({
      event,
      transaction_code: transactionCode,
      buyer_email: buyerEmail,
      source_account: sourceAccount,
      import_status: 'pending',
      payload,
      ...rawFields,
    });

    const saved = await this.rawRepo.save(raw);
    this.logger.log(
      `Raw salvo: id=${saved.id} transaction=${transactionCode ?? 'n/a'} account=${sourceAccount}`,
    );
    this.triggerProcessing(saved.id);
    return { saved: true, id: saved.id };
  }

  private async upsertPage(
    items: Record<string, unknown>[],
  ): Promise<{ saved: number; skipped: number }> {
    if (!items.length) return { saved: 0, skipped: 0 };

    const txCodes = items
      .map(item => this.extractHistoryItemFields(item).transactionCode)
      .filter((c): c is string => !!c);

    const existing = txCodes.length
      ? await this.rawRepo.find({
          where: { transaction_code: In(txCodes) },
          select: ['id', 'transaction_code', 'payload'],
        })
      : [];

    const existingMap = new Map(existing.map(e => [e.transaction_code ?? '', e]));
    const toInsert: DeepPartial<HotmartSaleRaw>[] = [];
    const toUpdate: Array<{ id: string; payload: Record<string, unknown> }> = [];
    let skipped = 0;

    for (const item of items) {
      const { transactionCode, buyerEmail } = this.extractHistoryItemFields(item);
      const ex = transactionCode ? existingMap.get(transactionCode) : undefined;

      if (ex) {
        if (this.getPurchaseStatus(ex.payload) !== this.getPurchaseStatus(item)) {
          toUpdate.push({ id: ex.id, payload: item });
        } else {
          skipped++;
        }
      } else {
        toInsert.push({
          event: 'HISTORY_SYNC',
          transaction_code: transactionCode,
          buyer_email: buyerEmail,
          source_account: HOTMART_SOURCE_ACCOUNT,
          import_status: 'pending',
          payload: item,
          ...this.extractRawFields(item),
        });
      }
    }

    if (toInsert.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await this.rawRepo.insert(toInsert as any[]);
      for (const identifier of result.identifiers) {
        this.triggerProcessing(identifier['id'] as string);
      }
    }

    if (toUpdate.length) {
      await Promise.all(
        toUpdate.map(async u => {
          const rawFields = this.extractRawFields(u.payload);
          await this.rawRepo.update(u.id, {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            payload: u.payload as any,
            import_status: 'pending',
            processed_at: undefined as unknown as Date,
            error: undefined,
            ...rawFields,
          });
          this.triggerProcessing(u.id);
        }),
      );
    }

    this.logger.log(
      `Página: inseridos=${toInsert.length} atualizados=${toUpdate.length} ignorados=${skipped}`,
    );
    return { saved: toInsert.length + toUpdate.length, skipped };
  }

  private triggerProcessing(rawId: string): void {
    if (PROCESS_VIA_QUEUE) {
      this.serviceBus.publish(HOTMART_SALE_QUEUE, { rawId }).catch(err =>
        this.logger.error(`Falha ao publicar na fila rawId=${rawId}: ${err.message}`),
      );
    } else {
      this.processor.processRaw(rawId).catch(err =>
        this.logger.warn(`Processamento direto falhou rawId=${rawId}: ${err.message}`),
      );
    }
  }

  private extractRawFields(payload: Record<string, unknown>) {
    const data = payload['data'] as Record<string, unknown> | undefined;
    const purchase = (data?.['purchase'] ?? payload['purchase']) as Record<string, unknown> | undefined;
    const product = (data?.['product'] ?? payload['product']) as Record<string, unknown> | undefined;
    return {
      purchase_status: purchase?.['status'] as string | undefined,
      product_id: product?.['id'] as number | undefined,
      product_name: product?.['name'] as string | undefined,
    };
  }

  private getPurchaseStatus(payload: Record<string, unknown>): string | undefined {
    const data = payload['data'] as Record<string, unknown> | undefined;
    const purchase = (data?.['purchase'] ?? payload['purchase']) as Record<string, unknown> | undefined;
    return purchase?.['status'] as string | undefined;
  }

  private extractWebhookFields(payload: Record<string, unknown>) {
    const event = payload['event'] as string | undefined;
    const data = payload['data'] as Record<string, unknown> | undefined;
    const purchase = data?.['purchase'] as Record<string, unknown> | undefined;
    const buyer = data?.['buyer'] as Record<string, unknown> | undefined;
    return {
      event,
      transactionCode: purchase?.['transaction'] as string | undefined,
      buyerEmail: buyer?.['email'] as string | undefined,
    };
  }

  private extractHistoryItemFields(item: Record<string, unknown>) {
    const purchase = item['purchase'] as Record<string, unknown> | undefined;
    const buyer = item['buyer'] as Record<string, unknown> | undefined;
    return {
      transactionCode: purchase?.['transaction'] as string | undefined,
      buyerEmail: buyer?.['email'] as string | undefined,
    };
  }

  private async fetchAccessToken(): Promise<string> {
    const basic = Buffer.from(`${HOTMART_CLIENT_ID}:${HOTMART_CLIENT_SECRET}`).toString('base64');
    this.logger.log(`Obtendo token Hotmart (sandbox=${HOTMART_SANDBOX})`);

    const response = await fetch(HOTMART_TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const raw = await response.text();
    if (!response.ok) {
      throw new Error(`Falha ao obter token Hotmart: ${response.status} — ${raw}`);
    }

    this.logger.log('Token Hotmart obtido com sucesso');
    return (JSON.parse(raw) as Record<string, unknown>)['access_token'] as string;
  }

  private buildHistoryUrl(
    params: { startDate?: string; endDate?: string; transactionStatus?: string },
    pageToken?: string,
  ): string {
    const url = new URL(`${HOTMART_API_BASE}/sales/history`);
    url.searchParams.set('max_results', '500');

    if (params.startDate) {
      url.searchParams.set('start_date', String(new Date(params.startDate).getTime()));
    }
    if (params.endDate) {
      url.searchParams.set('end_date', String(new Date(params.endDate).getTime()));
    }
    if (params.transactionStatus) {
      for (const status of params.transactionStatus.split(',')) {
        const s = status.trim();
        if (s) url.searchParams.append('transaction_status', s);
      }
    }
    if (pageToken) url.searchParams.set('page_token', pageToken);
    return url.toString();
  }
}
