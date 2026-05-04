import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGoogleCampaignConfiguration1770000000028
  implements MigrationInterface
{
  name = 'CreateGoogleCampaignConfiguration1770000000028';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "google_campaign_configuration" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "external_campaign_id" text,
        "status" text,
        "advertising_channel_type" text,
        "network_settings" jsonb,
        "bidding_strategy_type" text,
        "daily_budget" double precision,
        "targeting_expansion_setup" text,
        "start_date" date,
        "end_date" date,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_google_campaign_configuration_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "google_campaign_configuration"
    `);
  }
}
