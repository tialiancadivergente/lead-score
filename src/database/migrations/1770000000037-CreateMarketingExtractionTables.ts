import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMarketingExtractionTables1770000000037
  implements MigrationInterface
{
  name = 'CreateMarketingExtractionTables1770000000037';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "marketing_connection_account" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "oauth_connection_id" uuid NOT NULL,
        "provider" text NOT NULL,
        "external_account_id" text NOT NULL,
        "external_account_name" text,
        "parent_external_account_id" text,
        "is_manager" boolean NOT NULL DEFAULT false,
        "status" text NOT NULL DEFAULT 'active',
        "selected" boolean NOT NULL DEFAULT false,
        "last_seen_at" TIMESTAMP WITH TIME ZONE,
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_marketing_connection_account_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_marketing_connection_account_provider"
      ON "marketing_connection_account" ("provider")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_marketing_connection_account_connection_external"
      ON "marketing_connection_account" ("oauth_connection_id", "external_account_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "marketing_extract_job" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "oauth_connection_id" uuid NOT NULL,
        "provider" text NOT NULL,
        "external_account_id" text NOT NULL,
        "date_from" date NOT NULL,
        "date_to" date NOT NULL,
        "preset" text,
        "status" text NOT NULL DEFAULT 'pending',
        "requested_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "started_at" TIMESTAMP WITH TIME ZONE,
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "error_message" text,
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_marketing_extract_job_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_marketing_extract_job_provider"
      ON "marketing_extract_job" ("provider")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_marketing_extract_job_status"
      ON "marketing_extract_job" ("status")
    `);

    await queryRunner.query(`
      CREATE TABLE "marketing_extract_raw" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "job_id" uuid NOT NULL,
        "provider" text NOT NULL,
        "external_account_id" text NOT NULL,
        "report_date" date NOT NULL,
        "payload" jsonb NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_marketing_extract_raw_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_marketing_extract_raw_provider"
      ON "marketing_extract_raw" ("provider")
    `);

    await queryRunner.query(`
      CREATE TABLE "marketing_campaign_daily_performance" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "provider" text NOT NULL,
        "external_account_id" text NOT NULL,
        "external_campaign_id" text NOT NULL,
        "campaign_name" text,
        "report_date" date NOT NULL,
        "impressions" bigint NOT NULL DEFAULT '0',
        "clicks" bigint NOT NULL DEFAULT '0',
        "spend" numeric(18,6) NOT NULL DEFAULT 0,
        "conversions" numeric(18,6),
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_marketing_campaign_daily_performance_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_marketing_campaign_daily_performance_provider"
      ON "marketing_campaign_daily_performance" ("provider")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_marketing_campaign_daily_performance_external_account_id"
      ON "marketing_campaign_daily_performance" ("external_account_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_marketing_campaign_daily_performance_report_date"
      ON "marketing_campaign_daily_performance" ("report_date")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_marketing_campaign_daily_perf_provider_account_campaign_date"
      ON "marketing_campaign_daily_performance" (
        "provider",
        "external_account_id",
        "external_campaign_id",
        "report_date"
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "marketing_connection_account"
      ADD CONSTRAINT "FK_marketing_connection_account_oauth_connection"
      FOREIGN KEY ("oauth_connection_id") REFERENCES "oauth_connection"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "marketing_extract_job"
      ADD CONSTRAINT "FK_marketing_extract_job_oauth_connection"
      FOREIGN KEY ("oauth_connection_id") REFERENCES "oauth_connection"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "marketing_extract_raw"
      ADD CONSTRAINT "FK_marketing_extract_raw_job"
      FOREIGN KEY ("job_id") REFERENCES "marketing_extract_job"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "marketing_extract_raw"
      DROP CONSTRAINT "FK_marketing_extract_raw_job"
    `);

    await queryRunner.query(`
      ALTER TABLE "marketing_extract_job"
      DROP CONSTRAINT "FK_marketing_extract_job_oauth_connection"
    `);

    await queryRunner.query(`
      ALTER TABLE "marketing_connection_account"
      DROP CONSTRAINT "FK_marketing_connection_account_oauth_connection"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."UQ_marketing_campaign_daily_perf_provider_account_campaign_date"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."IDX_marketing_campaign_daily_performance_report_date"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."IDX_marketing_campaign_daily_performance_external_account_id"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."IDX_marketing_campaign_daily_performance_provider"
    `);
    await queryRunner.query(`
      DROP TABLE "marketing_campaign_daily_performance"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_marketing_extract_raw_provider"
    `);
    await queryRunner.query(`
      DROP TABLE "marketing_extract_raw"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_marketing_extract_job_status"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."IDX_marketing_extract_job_provider"
    `);
    await queryRunner.query(`
      DROP TABLE "marketing_extract_job"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."UQ_marketing_connection_account_connection_external"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."IDX_marketing_connection_account_provider"
    `);
    await queryRunner.query(`
      DROP TABLE "marketing_connection_account"
    `);
  }
}
