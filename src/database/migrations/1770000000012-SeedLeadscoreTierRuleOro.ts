import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedLeadscoreTierRuleOro1770000000012
  implements MigrationInterface
{
  name = 'SeedLeadscoreTierRuleOro1770000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "leadscore_tier_rule" r
      USING "leadscore_tier" t
      WHERE r."tier_id" = t."id"
        AND r."leadscore_id" = '7c9e8ea7-90c7-4d2c-b723-78a5bc4276c1'::uuid
        AND t."code" IN ('A', 'B', 'C', 'D', 'E')
    `);

    await queryRunner.query(`
      WITH rules AS (
        SELECT 'A'::text AS code, 180.3::double precision AS min_score, NULL::double precision AS max_score
        UNION ALL
        SELECT 'B'::text, 162.7::double precision, 180.3::double precision
        UNION ALL
        SELECT 'C'::text, 136.3::double precision, 162.7::double precision
        UNION ALL
        SELECT 'D'::text, 124.9::double precision, 136.3::double precision
        UNION ALL
        SELECT 'E'::text, NULL::double precision, 124.9::double precision
      )
      INSERT INTO "leadscore_tier_rule" ("leadscore_id", "tier_id", "min_score", "max_score")
      SELECT
        '7c9e8ea7-90c7-4d2c-b723-78a5bc4276c1'::uuid,
        t."id",
        r.min_score,
        r.max_score
      FROM rules r
      INNER JOIN "leadscore_tier" t ON t."code" = r.code
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "leadscore_tier_rule" r
      USING "leadscore_tier" t
      WHERE r."tier_id" = t."id"
        AND r."leadscore_id" = '7c9e8ea7-90c7-4d2c-b723-78a5bc4276c1'::uuid
        AND (
          (t."code" = 'A' AND r."min_score" = 180.3 AND r."max_score" IS NULL) OR
          (t."code" = 'B' AND r."min_score" = 162.7 AND r."max_score" = 180.3) OR
          (t."code" = 'C' AND r."min_score" = 136.3 AND r."max_score" = 162.7) OR
          (t."code" = 'D' AND r."min_score" = 124.9 AND r."max_score" = 136.3) OR
          (t."code" = 'E' AND r."min_score" IS NULL AND r."max_score" = 124.9)
        )
    `);
  }
}
