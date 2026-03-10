import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMetaAdDailyPerformanceAllMetrics1770000000024
  implements MigrationInterface
{
  name = 'CreateMetaAdDailyPerformanceAllMetrics1770000000024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "meta_ad_daily_performance_all_metrics" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "spend" double precision,
        "click" integer,
        "impressions" integer,
        "actions" jsonb,
        "cpm" integer,
        "ctr" double precision,
        "cpc" double precision,
        "platform_publish" text,
        "account_id" text,
        "account_currency" text,
        "external_account_id" text,
        "external_campaign_id" text,
        "external_ad_set_id" text,
        "external_ad_id" text,
        "date" date,
        "video_continuous_2_sec_watched_actions" integer,
        "video_p25_watched_actions" integer,
        "video_p50_watched_actions" integer,
        "video_p75_watched_actions" integer,
        "video_p95_watched_actions" integer,
        "video_p100_watched_actions" integer,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_meta_ad_daily_performance_all_metrics_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "meta_ad_daily_performance_all_metrics"
    `);
  }
}
