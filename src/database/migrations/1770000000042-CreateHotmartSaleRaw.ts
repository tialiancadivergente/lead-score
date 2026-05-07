import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHotmartSaleRaw1770000000042 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "hotmart_sale_raw" (
        "id"               uuid        NOT NULL DEFAULT gen_random_uuid(),
        "event"            text,
        "transaction_code" text,
        "buyer_email"      text,
        "import_status"    text        NOT NULL DEFAULT 'pending',
        "payload"          jsonb       NOT NULL,
        "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        "processed_at"     TIMESTAMPTZ,
        "error"            text,
        CONSTRAINT "PK_hotmart_sale_raw" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_hotmart_sale_raw_event" ON "hotmart_sale_raw" ("event")`,
    );

    // Unique parcial: permite múltiplos NULLs, bloqueia transaction_code duplicado
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_hotmart_sale_raw_transaction_code"
       ON "hotmart_sale_raw" ("transaction_code")
       WHERE "transaction_code" IS NOT NULL`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_hotmart_sale_raw_buyer_email" ON "hotmart_sale_raw" ("buyer_email")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_hotmart_sale_raw_import_status" ON "hotmart_sale_raw" ("import_status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "hotmart_sale_raw"`);
  }
}
