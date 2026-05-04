import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMetaAdConfiguration1770000000025
  implements MigrationInterface
{
  name = 'CreateMetaAdConfiguration1770000000025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "meta_ad_configuration" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "external_ad_id" text,
        "link" text,
        "url_tags" text,
        "fb_page" text,
        "ig_profile_id" text,
        "preview" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_meta_ad_configuration_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "meta_ad_configuration"
    `);
  }
}
