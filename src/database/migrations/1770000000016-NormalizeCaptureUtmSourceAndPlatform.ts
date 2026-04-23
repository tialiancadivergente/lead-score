import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeCaptureUtmSourceAndPlatform1770000000016
  implements MigrationInterface
{
  name = 'NormalizeCaptureUtmSourceAndPlatform1770000000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "capture" c
      SET "platform_id" = p.id
      FROM "platform" p
      WHERE p."source" IS NOT NULL
        AND c."utm_source" IS NOT NULL
        AND TRIM(c."utm_source") <> ''
        AND LOWER(
          CASE
            WHEN POSITION('_' IN TRIM(c."utm_source")) > 0
              THEN split_part(TRIM(c."utm_source"), '_', 1) || '_'
            ELSE TRIM(c."utm_source")
          END
        ) = LOWER(TRIM(p."source"))
        AND c."platform_id" IS DISTINCT FROM p.id
    `);

    await queryRunner.query(`
      UPDATE "capture" c
      SET "strategy_id" = (
        SELECT s.id
        FROM "strategy" s
        WHERE s."platform_id" = c."platform_id"
        ORDER BY s."created_at" ASC
        LIMIT 1
      )
      WHERE c."platform_id" IS NOT NULL
        AND c."strategy_id" IS DISTINCT FROM (
          SELECT s2.id
          FROM "strategy" s2
          WHERE s2."platform_id" = c."platform_id"
          ORDER BY s2."created_at" ASC
          LIMIT 1
        )
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Irreversível: normalização e backfill de dados.
  }
}
