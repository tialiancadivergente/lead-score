import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSourceAccountToHotmartSaleRaw1770000000043 implements MigrationInterface {
  name = 'AddSourceAccountToHotmartSaleRaw1770000000043';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "hotmart_sale_raw"
      ADD COLUMN IF NOT EXISTS "source_account" text
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_hotmart_sale_raw_source_account"
      ON "hotmart_sale_raw" ("source_account")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_hotmart_sale_raw_source_account"`);
    await queryRunner.query(`ALTER TABLE "hotmart_sale_raw" DROP COLUMN IF EXISTS "source_account"`);
  }
}
