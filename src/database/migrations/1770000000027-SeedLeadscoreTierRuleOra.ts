import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedLeadscoreTierRuleOra1770000000027 implements MigrationInterface {
  name = 'SeedLeadscoreTierRuleOra1770000000027';

  private readonly leadscoreId = '24246136-44fb-42e8-ba0b-c68d37fe70bc';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "leadscore_tier_rule" ltr
      USING "leadscore_tier" t
      WHERE ltr."tier_id" = t."id"
        AND ltr."leadscore_id" = '${this.leadscoreId}'::uuid
        AND t."code" IN ('A', 'B', 'C', 'D', 'E')
    `);

    await queryRunner.query(`
      WITH rules AS (
        SELECT 'A'::text AS code, 180.3::double precision AS min_score, NULL::double precision AS max_score
        UNION ALL SELECT 'B', 162.7, 180.3
        UNION ALL SELECT 'C', 136.3, 162.7
        UNION ALL SELECT 'D', 124.9, 136.3
        UNION ALL SELECT 'E', NULL,  124.9
      )
      INSERT INTO "leadscore_tier_rule" ("leadscore_id", "tier_id", "min_score", "max_score")
      SELECT
        '${this.leadscoreId}'::uuid,
        t."id",
        r.min_score,
        r.max_score
      FROM rules r
      INNER JOIN "leadscore_tier" t ON t."code" = r.code
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "leadscore_tier_rule" ltr
      USING "leadscore_tier" t
      WHERE ltr."tier_id" = t."id"
        AND ltr."leadscore_id" = '${this.leadscoreId}'::uuid
        AND t."code" IN ('A', 'B', 'C', 'D', 'E')
        AND (
          (t."code" = 'A' AND ltr."min_score" = 180.3 AND ltr."max_score" IS NULL) OR
          (t."code" = 'B' AND ltr."min_score" = 162.7 AND ltr."max_score" = 180.3) OR
          (t."code" = 'C' AND ltr."min_score" = 136.3 AND ltr."max_score" = 162.7) OR
          (t."code" = 'D' AND ltr."min_score" = 124.9 AND ltr."max_score" = 136.3) OR
          (t."code" = 'E' AND ltr."min_score" IS NULL AND ltr."max_score" = 124.9)
        )
    `);
  }
}
