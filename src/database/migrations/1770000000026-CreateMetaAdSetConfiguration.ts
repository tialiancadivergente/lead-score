import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMetaAdSetConfiguration1770000000026
  implements MigrationInterface
{
  name = 'CreateMetaAdSetConfiguration1770000000026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "meta_ad_set_configuration" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "external_ad_set_id" text,
        "daily_budget" double precision,
        "optimization_goal" text,
        "age_max" integer,
        "age_min" integer,
        "age_range" jsonb,
        "gender" text,
        "excluded_custom_audience" jsonb,
        "custom_audience" jsonb,
        "geo_location" jsonb,
        "geo_location_interaction" jsonb,
        "advantage_audience" integer,
        "publisher_platforms" jsonb,
        "facebook_positions" jsonb,
        "instagram_positions" jsonb,
        "device_platforms" jsonb,
        "pixel_id" text,
        "custom_event_type" text,
        "page_id" text,
        "custom_event_str" text,
        "bid_strategy" text,
        "start_time" TIMESTAMP WITH TIME ZONE,
        "end_time" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_meta_ad_set_configuration_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "meta_ad_set_configuration"
    `);
  }
}
