import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFieldsToHotmartSaleRaw1770000000044 implements MigrationInterface {
  name = 'AddFieldsToHotmartSaleRaw1770000000044';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "hotmart_sale_raw"
      ADD COLUMN IF NOT EXISTS "purchase_status" text,
      ADD COLUMN IF NOT EXISTS "product_id" bigint,
      ADD COLUMN IF NOT EXISTS "product_name" text
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_hotmart_sale_raw_purchase_status"
        ON "hotmart_sale_raw" ("purchase_status");
      CREATE INDEX IF NOT EXISTS "IDX_hotmart_sale_raw_product_id"
        ON "hotmart_sale_raw" ("product_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_hotmart_sale_raw_purchase_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_hotmart_sale_raw_product_id"`,
    );
    await queryRunner.query(`
      ALTER TABLE "hotmart_sale_raw"
      DROP COLUMN IF EXISTS "purchase_status",
      DROP COLUMN IF EXISTS "product_id",
      DROP COLUMN IF EXISTS "product_name"
    `);
  }
}
