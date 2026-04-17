import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMarketingSyncConfiguration1770000000039
  implements MigrationInterface
{
  name = 'CreateMarketingSyncConfiguration1770000000039';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "marketing_sync_configuration" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "sync_key" text NOT NULL,
        "provider" text,
        "enabled" boolean NOT NULL DEFAULT true,
        "schedule_enabled" boolean NOT NULL DEFAULT false,
        "schedule_interval_minutes" integer,
        "config" jsonb,
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_marketing_sync_configuration_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_marketing_sync_configuration_sync_key"
      ON "marketing_sync_configuration" ("sync_key")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_marketing_sync_configuration_provider"
      ON "marketing_sync_configuration" ("provider")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_marketing_sync_configuration_sync_key_provider"
      ON "marketing_sync_configuration" ("sync_key", "provider")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "public"."UQ_marketing_sync_configuration_sync_key_provider"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."IDX_marketing_sync_configuration_provider"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."IDX_marketing_sync_configuration_sync_key"
    `);
    await queryRunner.query(`
      DROP TABLE "marketing_sync_configuration"
    `);
  }
}
