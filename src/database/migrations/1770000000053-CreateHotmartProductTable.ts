import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHotmartProductTable1770000000053 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "hotmart_product" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "launch_id" UUID,
        "name" TEXT NOT NULL,
        "product_id" BIGINT NOT NULL,
        "active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_hotmart_product" PRIMARY KEY ("id"),
        CONSTRAINT "FK_hotmart_product_launch" FOREIGN KEY ("launch_id") REFERENCES "launch"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_hotmart_product_launch_id" ON "hotmart_product" ("launch_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_hotmart_product_product_id" ON "hotmart_product" ("product_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "hotmart_product"`);
  }
}
