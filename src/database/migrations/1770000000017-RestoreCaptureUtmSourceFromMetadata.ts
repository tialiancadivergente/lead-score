import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestoreCaptureUtmSourceFromMetadata1770000000017
  implements MigrationInterface
{
  name = 'RestoreCaptureUtmSourceFromMetadata1770000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "capture" c
      SET "utm_source" = src."restored_utm_source"
      FROM (
        SELECT
          c2."id",
          NULLIF(
            TRIM(
              COALESCE(
                c2."metadata" ->> 'utm_source',
                c2."metadata" -> 'payload' ->> 'utm_source',
                c2."metadata" -> 'utms' ->> 'utm_source',
                c2."metadata" -> 'payload' -> 'utms' ->> 'utm_source'
              )
            ),
            ''
          ) AS "restored_utm_source"
        FROM "capture" c2
      ) src
      WHERE c."id" = src."id"
        AND src."restored_utm_source" IS NOT NULL
        AND c."utm_source" IS DISTINCT FROM src."restored_utm_source"
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Irreversível: restauração de dados a partir do metadata.
  }
}
