import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHotmartSale1770000000045 implements MigrationInterface {
  name = 'CreateHotmartSale1770000000045';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hotmart_sale" (
        "id"                   uuid          NOT NULL DEFAULT gen_random_uuid(),
        "raw_id"               uuid          NOT NULL,
        "person_id"            uuid,
        "transaction_code"     text          NOT NULL,
        "source_account"       text,
        "product_id"           bigint,
        "product_name"         text,
        "offer_code"           text,
        "payment_mode"         text,
        "purchase_status"      text,
        "payment_type"         text,
        "payment_method"       text,
        "installments"         integer,
        "price"                numeric(10,2),
        "currency_code"        text,
        "is_subscription"      boolean       NOT NULL DEFAULT false,
        "order_date"           timestamptz,
        "approved_date"        timestamptz,
        "warranty_expire_date" timestamptz,
        "tracking_source"      text,
        "tracking_source_sck"  text,
        "external_code"        text,
        "buyer_email"          text,
        "buyer_name"           text,
        "buyer_ucode"          text,
        "created_at"           timestamptz   NOT NULL DEFAULT now(),
        "updated_at"           timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_hotmart_sale" PRIMARY KEY ("id"),
        CONSTRAINT "FK_hotmart_sale_raw"
          FOREIGN KEY ("raw_id") REFERENCES "hotmart_sale_raw" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_hotmart_sale_person"
          FOREIGN KEY ("person_id") REFERENCES "person" ("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_hotmart_sale_transaction_code" ON "hotmart_sale" ("transaction_code");
      CREATE INDEX "IDX_hotmart_sale_purchase_status" ON "hotmart_sale" ("purchase_status");
      CREATE INDEX "IDX_hotmart_sale_buyer_email"     ON "hotmart_sale" ("buyer_email");
      CREATE INDEX "IDX_hotmart_sale_product_id"      ON "hotmart_sale" ("product_id");
      CREATE INDEX "IDX_hotmart_sale_person_id"       ON "hotmart_sale" ("person_id");
      CREATE INDEX "IDX_hotmart_sale_order_date"      ON "hotmart_sale" ("order_date")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "hotmart_sale"`);
  }
}
