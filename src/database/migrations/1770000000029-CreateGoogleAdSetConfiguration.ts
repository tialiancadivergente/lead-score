import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGoogleAdSetConfiguration1770000000029
  implements MigrationInterface
{
  name = 'CreateGoogleAdSetConfiguration1770000000029';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "google_ad_set_configuration" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "external_adset_id" text,
        "status" text,
        "type" text,
        "cpc_bid_micros" bigint,
        "targeting_setting" jsonb,
        "final_url_suffix" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_google_ad_set_configuration_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "google_ad_set_configuration"
    `);
  }
}
