import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, In, Repository } from 'typeorm';
import { HotmartSaleRaw } from '../database/entities/hotmart/hotmart-sale-raw.entity';

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
// Auth server é o mesmo para sandbox e produção
const HOTMART_TOKEN_URL = 'https://api-sec-vlc.hotmart.com/security/oauth/token';

@Injectable()
export class HotmartService {
  private readonly logger = new Logger(HotmartService.name);

  constructor(
    @InjectRepository(HotmartSaleRaw)
    private readonly rawRepo: Repository<HotmartSaleRaw>,
  ) {}

  // ── Validação do hottok enviado pela Hotmart ──────────────────────────────

  validateHottok(incoming: string | undefined): void {
    if (!HOTMART_HOTTOK) {
      this.logger.warn(
        'HOTMART_HOTTOK não configurado — validação de assinatura ignorada',
      );
      return;
    }
    if (!incoming || incoming !== HOTMART_HOTTOK) {
      throw new UnauthorizedException('Hottok inválido');
    }
  }

  // ── Recepção de webhook ───────────────────────────────────────────────────

  async receiveWebhook(
    payload: Record<string, unknown>,
    hottok?: string,
  ): Promise<{ saved: boolean; id?: string; reason?: string }> {
    this.validateHottok(hottok);

    this.logger.log('=== HOTMART WEBHOOK RECEBIDO ===');
    this.logger.log(JSON.stringify(payload, null, 2));

    const { event, transactionCode, buyerEmail } =
      this.extractWebhookFields(payload);

    this.logger.log(
      `event=${event} transaction=${transactionCode ?? 'n/a'} email=${buyerEmail ?? 'n/a'}`,
    );

    return this.saveRawItem(event, transactionCode, buyerEmail, payload, HOTMART_SOURCE_ACCOUNT);
  }

  // ── Listagem para validação manual ───────────────────────────────────────

  async listRaw(limit = 50): Promise<HotmartSaleRaw[]> {
    return this.rawRepo.find({
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  // ── Sync histórico via API Hotmart ────────────────────────────────────────

  async syncHistory(
    params: { startDate?: string; endDate?: string; transactionStatus?: string } = {},
  ): Promise<{ synced: number; skipped: number; message?: string }> {
    if (!HOTMART_CLIENT_ID || !HOTMART_CLIENT_SECRET) {
      this.logger.warn(
        'HOTMART_CLIENT_ID ou HOTMART_CLIENT_SECRET não configurados — sync abortado',
      );
      return {
        synced: 0,
        skipped: 0,
        message: 'Configure HOTMART_CLIENT_ID e HOTMART_CLIENT_SECRET no .env',
      };
    }

    this.logger.log(
      `Iniciando sync histórico Hotmart: ${JSON.stringify(params)}`,
    );

    const token = await this.fetchAccessToken();
    let pageToken: string | undefined;
    let totalSaved = 0;
    let totalSkipped = 0;
    let page = 0;

    do {
      page++;
      const url = this.buildHistoryUrl(params, pageToken);
      this.logger.log(`Buscando página ${page}: ${url}`);

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(
          `Erro na API Hotmart: status=${response.status} body=${body}`,
        );
        break;
      }

      const json = (await response.json()) as Record<string, unknown>;
      const items =
        (json['items'] as Record<string, unknown>[] | undefined) ?? [];
      this.logger.log(`Página ${page}: ${items.length} itens recebidos`);

      const { saved, skipped } = await this.upsertPage(items);
      totalSaved += saved;
      totalSkipped += skipped;

      const pageInfo = json['page_info'] as
        | Record<string, unknown>
        | undefined;
      pageToken = pageInfo?.['next_page_token'] as string | undefined;
    } while (pageToken);

    this.logger.log(
      `Sync concluído. saved=${totalSaved} skipped=${totalSkipped}`,
    );
    return { synced: totalSaved, skipped: totalSkipped };
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
        const oldStatus = (existing.payload?.['purchase'] as Record<string, unknown> | undefined)?.['status'] as string | undefined;
        const newStatus = (payload?.['purchase'] as Record<string, unknown> | undefined)?.['status'] as string | undefined;

        if (oldStatus === newStatus) {
          this.logger.warn(
            `Transação já registrada com mesmo status (${newStatus ?? 'n/a'}), ignorando: ${transactionCode}`,
          );
          return { saved: false, reason: 'duplicate' };
        }

        this.logger.log(
          `Status alterado para transação ${transactionCode}: ${oldStatus ?? 'n/a'} → ${newStatus ?? 'n/a'} — atualizando registro`,
        );
        await this.rawRepo.update(existing.id, {
          event,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          payload: payload as any,
          import_status: 'pending',
          processed_at: undefined as unknown as Date,
          error: undefined,
        });
        return { saved: true, id: existing.id, reason: 'updated' };
      }
    }

    const raw = this.rawRepo.create({
      event,
      transaction_code: transactionCode,
      buyer_email: buyerEmail,
      source_account: sourceAccount,
      import_status: 'pending',
      payload,
    });

    const saved = await this.rawRepo.save(raw);
    this.logger.log(
      `Raw salvo: id=${saved.id} event=${event} transaction=${transactionCode ?? 'n/a'} account=${sourceAccount}`,
    );
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
        const oldStatus = (ex.payload?.['purchase'] as Record<string, unknown> | undefined)?.['status'] as string | undefined;
        const newStatus = (item?.['purchase'] as Record<string, unknown> | undefined)?.['status'] as string | undefined;
        if (oldStatus !== newStatus) {
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
        });
      }
    }

    if (toInsert.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.rawRepo.insert(toInsert as any[]);
    }

    if (toUpdate.length) {
      await Promise.all(
        toUpdate.map(u =>
          this.rawRepo.update(u.id, {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            payload: u.payload as any,
            import_status: 'pending',
            processed_at: undefined as unknown as Date,
            error: undefined,
          }),
        ),
      );
    }

    this.logger.log(
      `Página processada: inseridos=${toInsert.length} atualizados=${toUpdate.length} ignorados=${skipped}`,
    );
    return { saved: toInsert.length + toUpdate.length, skipped };
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
    const basic = Buffer.from(
      `${HOTMART_CLIENT_ID}:${HOTMART_CLIENT_SECRET}`,
    ).toString('base64');

    this.logger.log(`Obtendo token Hotmart: ${HOTMART_TOKEN_URL} (sandbox=${HOTMART_SANDBOX})`);

    const response = await fetch(HOTMART_TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const raw = await response.text();
    this.logger.log(`Token response: status=${response.status} body=${raw}`);

    if (!response.ok) {
      throw new Error(`Falha ao obter token Hotmart: ${response.status} — ${raw}`);
    }

    const json = JSON.parse(raw) as Record<string, unknown>;
    this.logger.log('Token Hotmart obtido com sucesso');
    return json['access_token'] as string;
  }

  private buildHistoryUrl(
    params: { startDate?: string; endDate?: string; transactionStatus?: string },
    pageToken?: string,
  ): string {
    const url = new URL(`${HOTMART_API_BASE}/sales/history`);
    url.searchParams.set('max_results', '500');

    if (params.startDate) {
      url.searchParams.set(
        'start_date',
        String(new Date(params.startDate).getTime()),
      );
    }
    if (params.endDate) {
      url.searchParams.set(
        'end_date',
        String(new Date(params.endDate).getTime()),
      );
    }
    // Passa cada status como query param separado (formato esperado pela Hotmart)
    if (params.transactionStatus) {
      for (const status of params.transactionStatus.split(',')) {
        const s = status.trim();
        if (s) url.searchParams.append('transaction_status', s);
      }
    }
    if (pageToken) {
      url.searchParams.set('page_token', pageToken);
    }
    return url.toString();
  }
}
