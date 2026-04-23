import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedLeadscoreTierRuleOra1770000000027
  implements MigrationInterface
{
  name = 'SeedLeadscoreTierRuleOra1770000000027';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "leadscore_tier_rule" ("leadscore_id", "tier_id", "min_score", "max_score")
      SELECT
        d.leadscore_id,
        d.tier_id,
        d.min_score,
        d.max_score
      FROM (
        VALUES
          (180.3::double precision, NULL::double precision, '24246136-44fb-42e8-ba0b-c68d37fe70bc'::uuid, 'c5759c04-c268-4429-8916-60df75251de7'::uuid),
          (162.7::double precision, 180.3::double precision, '24246136-44fb-42e8-ba0b-c68d37fe70bc'::uuid, '8712d867-a46f-4e5c-bea5-2aba14ceb974'::uuid),
          (136.3::double precision, 162.7::double precision, '24246136-44fb-42e8-ba0b-c68d37fe70bc'::uuid, '82074429-244b-46bf-b464-07a319ae98a1'::uuid),
          (124.9::double precision, 136.3::double precision, '24246136-44fb-42e8-ba0b-c68d37fe70bc'::uuid, '77d1c7fb-0cf9-4a02-b74a-a1ad91ec4208'::uuid),
          (NULL::double precision, 124.9::double precision, '24246136-44fb-42e8-ba0b-c68d37fe70bc'::uuid, 'd9ccf135-9f63-4989-b8e7-e291233a4058'::uuid)
      ) AS d(min_score, max_score, leadscore_id, tier_id)
      WHERE NOT EXISTS (
        SELECT 1
        FROM "leadscore_tier_rule" ltr
        WHERE ltr."leadscore_id" = d.leadscore_id
          AND ltr."tier_id" = d.tier_id
      )
    `);

    await queryRunner.query(`
      UPDATE "leadscore_tier_rule" ltr
      SET
        "min_score" = d.min_score,
        "max_score" = d.max_score
      FROM (
        VALUES
          (180.3::double precision, NULL::double precision, '24246136-44fb-42e8-ba0b-c68d37fe70bc'::uuid, 'c5759c04-c268-4429-8916-60df75251de7'::uuid),
          (162.7::double precision, 180.3::double precision, '24246136-44fb-42e8-ba0b-c68d37fe70bc'::uuid, '8712d867-a46f-4e5c-bea5-2aba14ceb974'::uuid),
          (136.3::double precision, 162.7::double precision, '24246136-44fb-42e8-ba0b-c68d37fe70bc'::uuid, '82074429-244b-46bf-b464-07a319ae98a1'::uuid),
          (124.9::double precision, 136.3::double precision, '24246136-44fb-42e8-ba0b-c68d37fe70bc'::uuid, '77d1c7fb-0cf9-4a02-b74a-a1ad91ec4208'::uuid),
          (NULL::double precision, 124.9::double precision, '24246136-44fb-42e8-ba0b-c68d37fe70bc'::uuid, 'd9ccf135-9f63-4989-b8e7-e291233a4058'::uuid)
      ) AS d(min_score, max_score, leadscore_id, tier_id)
      WHERE ltr."leadscore_id" = d.leadscore_id
        AND ltr."tier_id" = d.tier_id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "leadscore_tier_rule" ltr
      WHERE ltr."leadscore_id" = '24246136-44fb-42e8-ba0b-c68d37fe70bc'::uuid
        AND (
          (ltr."tier_id" = 'c5759c04-c268-4429-8916-60df75251de7'::uuid AND ltr."min_score" = 180.3 AND ltr."max_score" IS NULL) OR
          (ltr."tier_id" = '8712d867-a46f-4e5c-bea5-2aba14ceb974'::uuid AND ltr."min_score" = 162.7 AND ltr."max_score" = 180.3) OR
          (ltr."tier_id" = '82074429-244b-46bf-b464-07a319ae98a1'::uuid AND ltr."min_score" = 136.3 AND ltr."max_score" = 162.7) OR
          (ltr."tier_id" = '77d1c7fb-0cf9-4a02-b74a-a1ad91ec4208'::uuid AND ltr."min_score" = 124.9 AND ltr."max_score" = 136.3) OR
          (ltr."tier_id" = 'd9ccf135-9f63-4989-b8e7-e291233a4058'::uuid AND ltr."min_score" IS NULL AND ltr."max_score" = 124.9)
        )
    `);
  }
}

