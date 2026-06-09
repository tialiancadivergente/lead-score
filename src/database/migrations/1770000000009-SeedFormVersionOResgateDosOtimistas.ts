import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedFormVersionOResgateDosOtimistas1770000000009 implements MigrationInterface {
  name = 'SeedFormVersionOResgateDosOtimistas1770000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH target_form AS (
        SELECT f."id" AS form_id
        FROM "form" f
        INNER JOIN "launch" l ON l."id" = f."launch_id"
        INNER JOIN "season" s ON s."id" = f."season_id"
        WHERE LOWER(f."name") = LOWER('O Resgate dos Otimistas')
          AND LOWER(l."name") = 'oro'
          AND LOWER(s."name") = 'nov25'
      )
      INSERT INTO "form_version" ("id", "form_id", "version_number", "active")
      SELECT
        '2f76bc57-57a2-41fd-9c2c-18a726dd4fe0'::uuid,
        tf.form_id,
        1,
        true
      FROM target_form tf
      WHERE NOT EXISTS (
        SELECT 1
        FROM "form_version" fv
        CROSS JOIN target_form tf
        WHERE fv."form_id" = tf.form_id
          AND fv."version_number" = 1
      )
    `);

    await queryRunner.query(`
      WITH target_form AS (
        SELECT f."id" AS form_id
        FROM "form" f
        INNER JOIN "launch" l ON l."id" = f."launch_id"
        INNER JOIN "season" s ON s."id" = f."season_id"
        WHERE LOWER(f."name") = LOWER('O Resgate dos Otimistas')
          AND LOWER(l."name") = 'oro'
          AND LOWER(s."name") = 'nov25'
      )
      UPDATE "form_version"
      SET "active" = true
      WHERE "form_id" = (SELECT form_id FROM target_form)
        AND "version_number" = 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH target_form AS (
        SELECT f."id" AS form_id
        FROM "form" f
        INNER JOIN "launch" l ON l."id" = f."launch_id"
        INNER JOIN "season" s ON s."id" = f."season_id"
        WHERE LOWER(f."name") = LOWER('O Resgate dos Otimistas')
          AND LOWER(l."name") = 'oro'
          AND LOWER(s."name") = 'nov25'
      )
      DELETE FROM "form_version" fv
      USING target_form tf
      WHERE fv."form_id" = tf.form_id
        AND fv."version_number" = 1
        AND NOT EXISTS (
          SELECT 1
          FROM "form_response" fr
          WHERE fr."form_version_id" = fv."id"
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "capture" c
          WHERE c."form_version_id" = fv."id"
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "form_version_question" fvq
          WHERE fvq."form_version_id" = fv."id"
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "leadscore" ls
          WHERE ls."form_version_id" = fv."id"
        )
    `);
  }
}
