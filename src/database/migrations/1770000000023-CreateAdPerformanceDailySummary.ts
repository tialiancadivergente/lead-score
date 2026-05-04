import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdPerformanceDailySummary1770000000023
  implements MigrationInterface
{
  name = 'CreateAdPerformanceDailySummary1770000000023';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ad_performance_daily_summary" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "platform_id" uuid,
        "external_ad_id" text,
        "external_adset_id" text,
        "external_campaign_id" text,
        "date" date,
        "spend" double precision,
        "click" integer,
        "impressions" integer,
        "cpm" double precision,
        "cpc" double precision,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ad_performance_daily_summary_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "ad_performance_daily_summary"
      ADD CONSTRAINT "FK_ad_performance_daily_summary_platform"
      FOREIGN KEY ("platform_id") REFERENCES "platform"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ad_performance_daily_summary"
      DROP CONSTRAINT "FK_ad_performance_daily_summary_platform"
    `);

    await queryRunner.query(`
      DROP TABLE "ad_performance_daily_summary"
    `);
  }
}
