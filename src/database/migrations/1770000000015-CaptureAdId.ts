import { MigrationInterface, QueryRunner } from 'typeorm';

export class CaptureAdId1770000000015 implements MigrationInterface {
  name = 'CaptureAdId1770000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "capture"
      ADD COLUMN IF NOT EXISTS "ad_id" text
    `);

    await queryRunner.query(`
      UPDATE "capture"
      SET "ad_id" = COALESCE(
        (regexp_match("utm_content", '(?i)_id_([0-9]+)'))[1],
        CASE
          WHEN "utm_content" ~ '^[0-9]+$' THEN "utm_content"
          ELSE NULL
        END
      )
      WHERE ("ad_id" IS NULL OR TRIM("ad_id") = '')
        AND "utm_content" IS NOT NULL
        AND TRIM("utm_content") <> ''
        AND (
          "utm_content" ~* '_id_[0-9]+'
          OR "utm_content" ~ '^[0-9]+$'
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "capture"
      DROP COLUMN IF EXISTS "ad_id"
    `);
  }
}
