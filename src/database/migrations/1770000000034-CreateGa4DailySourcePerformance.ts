import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGa4DailySourcePerformance1770000000034
  implements MigrationInterface
{
  name = 'CreateGa4DailySourcePerformance1770000000034';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ga4_daily_source_performance" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "date" date,
        "external_property_id" text,
        "domain" text,
        "path" text,
        "session_source" text,
        "session_medium" text,
        "session_campaign_name" text,
        "session_campaign_id" text,
        "session_content" text,
        "session_term" text,
        "external_ad_id" text,
        "sessions" integer,
        "page_view" integer,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ga4_daily_source_performance_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "ga4_daily_source_performance"
    `);
  }
}
