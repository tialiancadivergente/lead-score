import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedLeadscoreTierRuleOro1770000000012
  implements MigrationInterface
{
  name = 'SeedLeadscoreTierRuleOro1770000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH target_leadscore AS (
        SELECT ls."id" AS leadscore_id
        FROM "leadscore" ls
        INNER JOIN "form_version" fv ON fv."id" = ls."form_version_id"
        INNER JOIN "form" f ON f."id" = fv."form_id"
        INNER JOIN "launch" l ON l."id" = f."launch_id"
        INNER JOIN "season" s ON s."id" = f."season_id"
        WHERE LOWER(ls."name") = LOWER('leadscore oro')
          AND LOWER(f."name") = LOWER('O Resgate dos Otimistas')
          AND LOWER(l."name") = 'oro'
          AND LOWER(s."name") = 'nov25'
          AND fv."version_number" = 1
      )
      DELETE FROM "leadscore_tier_rule" r
      USING "leadscore_tier" t, target_leadscore tl
      WHERE r."tier_id" = t."id"
        AND r."leadscore_id" = tl.leadscore_id
        AND t."code" IN ('A', 'B', 'C', 'D', 'E')
    `);

    await queryRunner.query(`
      WITH target_leadscore AS (
        SELECT ls."id" AS leadscore_id
        FROM "leadscore" ls
        INNER JOIN "form_version" fv ON fv."id" = ls."form_version_id"
        INNER JOIN "form" f ON f."id" = fv."form_id"
        INNER JOIN "launch" l ON l."id" = f."launch_id"
        INNER JOIN "season" s ON s."id" = f."season_id"
        WHERE LOWER(ls."name") = LOWER('leadscore oro')
          AND LOWER(f."name") = LOWER('O Resgate dos Otimistas')
          AND LOWER(l."name") = 'oro'
          AND LOWER(s."name") = 'nov25'
          AND fv."version_number" = 1
      ),
      rules AS (
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
        tl.leadscore_id,
        t."id",
        r.min_score,
        r.max_score
      FROM target_leadscore tl
      CROSS JOIN rules r
      INNER JOIN "leadscore_tier" t ON t."code" = r.code
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH target_leadscore AS (
        SELECT ls."id" AS leadscore_id
        FROM "leadscore" ls
        INNER JOIN "form_version" fv ON fv."id" = ls."form_version_id"
        INNER JOIN "form" f ON f."id" = fv."form_id"
        INNER JOIN "launch" l ON l."id" = f."launch_id"
        INNER JOIN "season" s ON s."id" = f."season_id"
        WHERE LOWER(ls."name") = LOWER('leadscore oro')
          AND LOWER(f."name") = LOWER('O Resgate dos Otimistas')
          AND LOWER(l."name") = 'oro'
          AND LOWER(s."name") = 'nov25'
          AND fv."version_number" = 1
      )
      DELETE FROM "leadscore_tier_rule" r
      USING "leadscore_tier" t, target_leadscore tl
      WHERE r."tier_id" = t."id"
        AND r."leadscore_id" = tl.leadscore_id
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
