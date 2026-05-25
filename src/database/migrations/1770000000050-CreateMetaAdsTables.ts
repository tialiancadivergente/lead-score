import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMetaAdsTables1770000000050 implements MigrationInterface {
  name = 'CreateMetaAdsTables1770000000050';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "meta_campaigns_raw" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "external_account_id" text NOT NULL,
        "external_campaign_id" text NOT NULL,
        "campaign_name" text,
        "status" text,
        "effective_status" text,
        "objective" text,
        "payload" jsonb NOT NULL,
        "fetched_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_meta_campaigns_raw_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_meta_campaigns_raw_account_campaign"
      ON "meta_campaigns_raw" ("external_account_id", "external_campaign_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_meta_campaigns_raw_account"
      ON "meta_campaigns_raw" ("external_account_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "meta_adsets_raw" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "external_account_id" text NOT NULL,
        "external_adset_id" text NOT NULL,
        "external_campaign_id" text,
        "adset_name" text,
        "status" text,
        "effective_status" text,
        "payload" jsonb NOT NULL,
        "fetched_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_meta_adsets_raw_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_meta_adsets_raw_account_adset"
      ON "meta_adsets_raw" ("external_account_id", "external_adset_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_meta_adsets_raw_account"
      ON "meta_adsets_raw" ("external_account_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_meta_adsets_raw_campaign"
      ON "meta_adsets_raw" ("external_campaign_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "meta_ads_raw" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "external_account_id" text NOT NULL,
        "external_ad_id" text NOT NULL,
        "external_adset_id" text,
        "external_campaign_id" text,
        "ad_name" text,
        "status" text,
        "effective_status" text,
        "thumbnail_url" text,
        "payload" jsonb NOT NULL,
        "fetched_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_meta_ads_raw_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_meta_ads_raw_account_ad"
      ON "meta_ads_raw" ("external_account_id", "external_ad_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_meta_ads_raw_account"
      ON "meta_ads_raw" ("external_account_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_meta_ads_raw_campaign"
      ON "meta_ads_raw" ("external_campaign_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_meta_ads_raw_adset"
      ON "meta_ads_raw" ("external_adset_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "meta_ad_performance" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "external_account_id" text NOT NULL,
        "account_name" text,
        "external_campaign_id" text,
        "campaign_name" text,
        "external_adset_id" text,
        "adset_name" text,
        "external_ad_id" text NOT NULL,
        "ad_name" text,
        "report_date" date NOT NULL,
        "publisher_platform" text NOT NULL DEFAULT 'total',
        "impressions" bigint NOT NULL DEFAULT '0',
        "clicks" bigint NOT NULL DEFAULT '0',
        "reach" bigint,
        "inline_link_clicks" bigint,
        "spend" numeric(18,6) NOT NULL DEFAULT 0,
        "ctr" numeric(18,6),
        "cpc" numeric(18,6),
        "cpm" numeric(18,6),
        "leads" numeric(18,6) NOT NULL DEFAULT 0,
        "landing_page_views" bigint NOT NULL DEFAULT '0',
        "initiate_checkouts" bigint NOT NULL DEFAULT '0',
        "purchases" bigint NOT NULL DEFAULT '0',
        "video_views" bigint,
        "video_p25_watched" bigint,
        "video_p50_watched" bigint,
        "video_p75_watched" bigint,
        "video_p100_watched" bigint,
        "video_thruplay_watched" bigint,
        "video_avg_time_watched" numeric(18,6),
        "video_30s_watched" bigint,
        "video_continuous_2s_watched" bigint,
        "connect_rate" numeric(18,6),
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_meta_ad_performance_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_meta_ad_performance_ad_date_platform"
      ON "meta_ad_performance" (
        "external_account_id",
        "external_ad_id",
        "report_date",
        "publisher_platform"
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_meta_ad_performance_account_date"
      ON "meta_ad_performance" ("external_account_id", "report_date")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_meta_ad_performance_campaign_date"
      ON "meta_ad_performance" ("external_campaign_id", "report_date")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_meta_ad_performance_adset_date"
      ON "meta_ad_performance" ("external_adset_id", "report_date")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_meta_ad_performance_date"
      ON "meta_ad_performance" ("report_date")
    `);

    await queryRunner.query(`
      CREATE TABLE "meta_sync_executions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "triggered_by" text NOT NULL DEFAULT 'scheduler',
        "step" text NOT NULL,
        "status" text NOT NULL DEFAULT 'running',
        "external_account_id" text,
        "date_from" text,
        "date_to" text,
        "records_processed" integer NOT NULL DEFAULT 0,
        "error_message" text,
        "metadata" jsonb,
        "started_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "finished_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_meta_sync_executions_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_meta_sync_executions_status"
      ON "meta_sync_executions" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_meta_sync_executions_started_at"
      ON "meta_sync_executions" ("started_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "meta_sync_executions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "meta_ad_performance"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "meta_ads_raw"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "meta_adsets_raw"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "meta_campaigns_raw"`);
  }
}
