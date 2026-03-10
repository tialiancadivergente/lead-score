import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGoogleAdAssetPerformance1770000000031
  implements MigrationInterface
{
  name = 'CreateGoogleAdAssetPerformance1770000000031';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "google_ad_asset_performance" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "external_ad_id" text,
        "asset_id" text,
        "asset_type" text,
        "asset_text" text,
        "performance_label" text,
        "date" date,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_google_ad_asset_performance_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "google_ad_asset_performance"
    `);
  }
}
