import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HotmartSaleRaw } from '../database/entities/hotmart/hotmart-sale-raw.entity';
import { HotmartSale } from '../database/entities/hotmart/hotmart-sale.entity';
import { IdentifierType, IdentifierTypeCode } from '../database/entities/identity/identifier-type.entity';
import { Person } from '../database/entities/identity/person.entity';
import { PersonIdentifier } from '../database/entities/identity/person-identifier.entity';

type SaleFields = ReturnType<HotmartProcessorService['extractSaleFields']>;

@Injectable()
export class HotmartProcessorService {
  private readonly logger = new Logger(HotmartProcessorService.name);
  private emailType?: IdentifierType;

  constructor(
    @InjectRepository(HotmartSaleRaw)
    private readonly rawRepo: Repository<HotmartSaleRaw>,
    @InjectRepository(HotmartSale)
    private readonly saleRepo: Repository<HotmartSale>,
    @InjectRepository(Person)
    private readonly personRepo: Repository<Person>,
    @InjectRepository(PersonIdentifier)
    private readonly identifierRepo: Repository<PersonIdentifier>,
    @InjectRepository(IdentifierType)
    private readonly identifierTypeRepo: Repository<IdentifierType>,
  ) {}

  async processRaw(rawId: string): Promise<void> {
    const raw = await this.rawRepo.findOne({ where: { id: rawId } });
    if (!raw) {
      this.logger.warn(`Raw não encontrado: ${rawId}`);
      return;
    }
    if (raw.import_status === 'processed') {
      this.logger.debug(`Raw já processado, ignorando: ${rawId}`);
      return;
    }

    this.logger.log(`Processando raw=${rawId} transaction=${raw.transaction_code ?? 'n/a'} status=${raw.import_status}`);
    await this.rawRepo.update(rawId, { import_status: 'processing' });

    try {
      const fields = this.extractSaleFields(raw);
      const person = await this.findOrCreatePerson(fields.buyerEmail, fields.buyerName);

      await this.saleRepo.upsert(
        this.buildSaleRecord(rawId, person.id, fields, raw.source_account),
        { conflictPaths: ['transaction_code'] },
      );

      await this.rawRepo.update(rawId, {
        import_status: 'processed',
        processed_at: new Date(),
        error: undefined,
      });

      this.logger.log(`Processado raw=${rawId} transaction=${fields.transactionCode ?? 'n/a'}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.rawRepo.update(rawId, { import_status: 'error', error: message });
      this.logger.error(`Falha ao processar raw=${rawId}: ${message}`);
      throw err;
    }
  }

  async processBatch(limit = 100): Promise<{ processed: number; failed: number }> {
    const pending = await this.rawRepo.find({
      where: { import_status: 'pending' },
      order: { created_at: 'ASC' },
      take: limit,
      select: ['id'],
    });

    this.logger.log(`Batch iniciado: ${pending.length} registros pending encontrados (limit=${limit})`);
    if (!pending.length) return { processed: 0, failed: 0 };

    let processed = 0;
    let failed = 0;
    const CHUNK = 10;

    for (let i = 0; i < pending.length; i += CHUNK) {
      const results = await Promise.allSettled(
        pending.slice(i, i + CHUNK).map(r => this.processRaw(r.id)),
      );
      for (const r of results) {
        if (r.status === 'fulfilled') processed++;
        else failed++;
      }
    }

    this.logger.log(`Batch concluído: processed=${processed} failed=${failed}`);
    return { processed, failed };
  }

  private buildSaleRecord(
    rawId: string,
    personId: string,
    f: SaleFields,
    sourceAccount?: string,
  ) {
    return {
      raw_id: rawId,
      person_id: personId,
      transaction_code: f.transactionCode!,
      source_account: sourceAccount,
      product_id: f.productId,
      product_name: f.productName,
      offer_code: f.offerCode,
      payment_mode: f.paymentMode,
      purchase_status: f.purchaseStatus,
      payment_type: f.paymentType,
      payment_method: f.paymentMethod,
      installments: f.installments,
      price: f.price,
      currency_code: f.currencyCode,
      is_subscription: f.isSubscription ?? false,
      order_date: f.orderDate,
      approved_date: f.approvedDate,
      warranty_expire_date: f.warrantyExpireDate,
      tracking_source: f.trackingSource,
      tracking_source_sck: f.trackingSourceSck,
      external_code: f.externalCode,
      buyer_email: f.buyerEmail,
      buyer_name: f.buyerName,
      buyer_ucode: f.buyerUcode,
    };
  }

  private async findOrCreatePerson(
    email: string | undefined,
    name: string | undefined,
  ): Promise<Person> {
    const emailType = await this.getEmailType();

    if (email) {
      const identifier = await this.identifierRepo.findOne({
        where: {
          identifier_type: { id: emailType.id },
          value_normalized: email.toLowerCase(),
        },
        relations: ['person'],
      });
      if (identifier) return identifier.person;
    }

    const person = await this.personRepo.save(
      this.personRepo.create({ nome_consolidado: name ?? undefined }),
    );

    if (email) {
      await this.identifierRepo.save(
        this.identifierRepo.create({
          person,
          identifier_type: emailType,
          value_normalized: email.toLowerCase(),
          is_primary: true,
        }),
      );
    }

    return person;
  }

  private async getEmailType(): Promise<IdentifierType> {
    this.emailType ??= await this.identifierTypeRepo.findOneOrFail({
      where: { code: IdentifierTypeCode.EMAIL },
    });
    return this.emailType;
  }

  private extractSaleFields(raw: HotmartSaleRaw) {
    const p = raw.payload;
    // Suporta formato webhook (data.buyer/purchase/product) e histórico (buyer/purchase/product)
    const data = p['data'] as Record<string, unknown> | undefined;
    const buyer = (data?.['buyer'] ?? p['buyer']) as Record<string, unknown> | undefined;
    const product = (data?.['product'] ?? p['product']) as Record<string, unknown> | undefined;
    const purchase = (data?.['purchase'] ?? p['purchase']) as Record<string, unknown> | undefined;
    const offer = purchase?.['offer'] as Record<string, unknown> | undefined;
    const priceObj = purchase?.['price'] as Record<string, unknown> | undefined;
    const payment = purchase?.['payment'] as Record<string, unknown> | undefined;
    const tracking = purchase?.['tracking'] as Record<string, unknown> | undefined;

    const toDate = (v: unknown) => (typeof v === 'number' ? new Date(v) : undefined);

    return {
      buyerEmail: buyer?.['email'] as string | undefined,
      buyerName: buyer?.['name'] as string | undefined,
      buyerUcode: buyer?.['ucode'] as string | undefined,
      productId: product?.['id'] as number | undefined,
      productName: product?.['name'] as string | undefined,
      offerCode: offer?.['code'] as string | undefined,
      paymentMode: offer?.['payment_mode'] as string | undefined,
      purchaseStatus: purchase?.['status'] as string | undefined,
      paymentType: payment?.['type'] as string | undefined,
      paymentMethod: payment?.['method'] as string | undefined,
      installments: payment?.['installments_number'] as number | undefined,
      price: priceObj?.['value'] as number | undefined,
      currencyCode: priceObj?.['currency_code'] as string | undefined,
      isSubscription: purchase?.['is_subscription'] as boolean | undefined,
      transactionCode: purchase?.['transaction'] as string | undefined,
      orderDate: toDate(purchase?.['order_date']),
      approvedDate: toDate(purchase?.['approved_date']),
      warrantyExpireDate: toDate(purchase?.['warranty_expire_date']),
      trackingSource: tracking?.['source'] as string | undefined,
      trackingSourceSck: tracking?.['source_sck'] as string | undefined,
      externalCode: tracking?.['external_code'] as string | undefined,
    };
  }
}
