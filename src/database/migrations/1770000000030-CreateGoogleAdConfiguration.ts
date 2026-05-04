import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGoogleAdConfiguration1770000000030
  implements MigrationInterface
{
  name = 'CreateGoogleAdConfiguration1770000000030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "google_ad_configuration" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "external_ad_id" text,
        "status" text,
        "type" text,
        "final_urls" jsonb,
        "display_url" text,
        "headlines" jsonb,
        "descriptions" jsonb,
        "tracking_url_template" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_google_ad_configuration_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "google_ad_configuration"
    `);
  }
}
