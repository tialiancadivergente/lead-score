import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHotmartProductIdToLaunch1770000000051 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "launch" ADD COLUMN "hotmart_product_id" BIGINT`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_launch_hotmart_product_id" ON "launch" ("hotmart_product_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_launch_hotmart_product_id"`);
    await queryRunner.query(
      `ALTER TABLE "launch" DROP COLUMN "hotmart_product_id"`,
    );
  }
}
