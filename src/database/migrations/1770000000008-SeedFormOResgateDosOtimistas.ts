import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedFormOResgateDosOtimistas1770000000008 implements MigrationInterface {
  name = 'SeedFormOResgateDosOtimistas1770000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH target AS (
        SELECT
          l.id AS launch_id,
          s.id AS season_id
        FROM "launch" l
        INNER JOIN "season" s ON s."launch_id" = l."id"
        WHERE LOWER(l."name") = 'oro'
          AND LOWER(s."name") = 'nov25'
      )
      INSERT INTO "form" ("id", "name", "launch_id", "season_id")
      SELECT
        '7405904f-64b9-4b2e-a067-a5fa246e1d55'::uuid,
        'O Resgate dos Otimistas',
        t.launch_id,
        t.season_id
      FROM target t
      WHERE NOT EXISTS (
        SELECT 1
        FROM "form" f
        CROSS JOIN target t
        WHERE LOWER(f."name") = LOWER('O Resgate dos Otimistas')
          AND f."launch_id" = t.launch_id
          AND f."season_id" = t.season_id
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH target AS (
        SELECT
          l.id AS launch_id,
          s.id AS season_id
        FROM "launch" l
        INNER JOIN "season" s ON s."launch_id" = l."id"
        WHERE LOWER(l."name") = 'oro'
          AND LOWER(s."name") = 'nov25'
      )
      DELETE FROM "form" f
      USING target t
      WHERE LOWER(f."name") = LOWER('O Resgate dos Otimistas')
        AND f."launch_id" = t.launch_id
        AND f."season_id" = t.season_id
        AND NOT EXISTS (
          SELECT 1
          FROM "form_version" fv
          WHERE fv."form_id" = f."id"
        )
    `);
  }
}
