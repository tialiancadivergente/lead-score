import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMarketingAdDailyPerformance1770000000038
  implements MigrationInterface
{
  name = 'CreateMarketingAdDailyPerformance1770000000038';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "marketing_ad_daily_performance" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "provider" text NOT NULL,
        "external_account_id" text NOT NULL,
        "account_name" text,
        "external_campaign_id" text,
        "campaign_name" text,
        "external_adset_id" text,
        "adset_name" text,
        "external_ad_id" text NOT NULL,
        "ad_name" text,
        "report_date" date NOT NULL,
        "impressions" bigint NOT NULL DEFAULT '0',
        "clicks" bigint NOT NULL DEFAULT '0',
        "spend" numeric(18,6) NOT NULL DEFAULT 0,
        "conversions" numeric(18,6),
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_marketing_ad_daily_performance_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_marketing_ad_daily_performance_provider"
      ON "marketing_ad_daily_performance" ("provider")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_marketing_ad_daily_performance_external_account_id"
      ON "marketing_ad_daily_performance" ("external_account_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_marketing_ad_daily_performance_report_date"
      ON "marketing_ad_daily_performance" ("report_date")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_marketing_ad_daily_perf_provider_account_date"
      ON "marketing_ad_daily_performance" (
        "provider",
        "external_account_id",
        "report_date"
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_marketing_ad_daily_perf_provider_campaign_date"
      ON "marketing_ad_daily_performance" (
        "provider",
        "external_campaign_id",
        "report_date"
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_marketing_ad_daily_perf_provider_adset_date"
      ON "marketing_ad_daily_performance" (
        "provider",
        "external_adset_id",
        "report_date"
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_marketing_ad_daily_perf_provider_account_ad_date"
      ON "marketing_ad_daily_performance" (
        "provider",
        "external_account_id",
        "external_ad_id",
        "report_date"
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "public"."UQ_marketing_ad_daily_perf_provider_account_ad_date"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."IDX_marketing_ad_daily_perf_provider_adset_date"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."IDX_marketing_ad_daily_perf_provider_campaign_date"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."IDX_marketing_ad_daily_perf_provider_account_date"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."IDX_marketing_ad_daily_performance_report_date"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."IDX_marketing_ad_daily_performance_external_account_id"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."IDX_marketing_ad_daily_performance_provider"
    `);
    await queryRunner.query(`
      DROP TABLE "marketing_ad_daily_performance"
    `);
  }
}
