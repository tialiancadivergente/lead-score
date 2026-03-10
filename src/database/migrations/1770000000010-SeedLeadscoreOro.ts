import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedLeadscoreOro1770000000010 implements MigrationInterface {
  name = 'SeedLeadscoreOro1770000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH target_form_version AS (
        SELECT fv."id" AS form_version_id
        FROM "form_version" fv
        INNER JOIN "form" f ON f."id" = fv."form_id"
        INNER JOIN "launch" l ON l."id" = f."launch_id"
        INNER JOIN "season" s ON s."id" = f."season_id"
        WHERE LOWER(f."name") = LOWER('O Resgate dos Otimistas')
          AND LOWER(l."name") = 'oro'
          AND LOWER(s."name") = 'nov25'
          AND fv."version_number" = 1
      )
      INSERT INTO "leadscore" ("form_version_id", "name", "active")
      SELECT
        tfv.form_version_id,
        'leadscore oro',
        true
      FROM target_form_version tfv
      WHERE NOT EXISTS (
        SELECT 1
        FROM "leadscore" ls
        CROSS JOIN target_form_version tfv
        WHERE ls."form_version_id" = tfv.form_version_id
          AND LOWER(ls."name") = LOWER('leadscore oro')
      )
    `);

    await queryRunner.query(`
      WITH target_form_version AS (
        SELECT fv."id" AS form_version_id
        FROM "form_version" fv
        INNER JOIN "form" f ON f."id" = fv."form_id"
        INNER JOIN "launch" l ON l."id" = f."launch_id"
        INNER JOIN "season" s ON s."id" = f."season_id"
        WHERE LOWER(f."name") = LOWER('O Resgate dos Otimistas')
          AND LOWER(l."name") = 'oro'
          AND LOWER(s."name") = 'nov25'
          AND fv."version_number" = 1
      )
      UPDATE "leadscore"
      SET "active" = true
      WHERE "form_version_id" = (SELECT form_version_id FROM target_form_version)
        AND LOWER("name") = LOWER('leadscore oro')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH target_form_version AS (
        SELECT fv."id" AS form_version_id
        FROM "form_version" fv
        INNER JOIN "form" f ON f."id" = fv."form_id"
        INNER JOIN "launch" l ON l."id" = f."launch_id"
        INNER JOIN "season" s ON s."id" = f."season_id"
        WHERE LOWER(f."name") = LOWER('O Resgate dos Otimistas')
          AND LOWER(l."name") = 'oro'
          AND LOWER(s."name") = 'nov25'
          AND fv."version_number" = 1
      )
      DELETE FROM "leadscore" ls
      USING target_form_version tfv
      WHERE ls."form_version_id" = tfv.form_version_id
        AND LOWER(ls."name") = LOWER('leadscore oro')
        AND NOT EXISTS (
          SELECT 1
          FROM "leadscore_option_points" lop
          WHERE lop."leadscore_id" = ls."id"
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "leadscore_range_points" lrp
          WHERE lrp."leadscore_id" = ls."id"
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "leadscore_tier_rule" ltr
          WHERE ltr."leadscore_id" = ls."id"
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "leadscore_result" lr
          WHERE lr."leadscore_id" = ls."id"
        )
    `);
  }
}
