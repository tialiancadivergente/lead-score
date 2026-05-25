import { MigrationInterface, QueryRunner } from 'typeorm';

export class RevertHotmartProductIdFromLaunch1770000000052 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_launch_hotmart_product_id"`);
    await queryRunner.query(`ALTER TABLE "launch" DROP COLUMN IF EXISTS "hotmart_product_id"`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "launch" ADD COLUMN "hotmart_product_id" BIGINT`);
    await queryRunner.query(`CREATE INDEX "IDX_launch_hotmart_product_id" ON "launch" ("hotmart_product_id")`);
  }
}
