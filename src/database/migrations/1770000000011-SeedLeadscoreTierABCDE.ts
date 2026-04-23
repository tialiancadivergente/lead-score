import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedLeadscoreTierABCDE1770000000011
  implements MigrationInterface
{
  name = 'SeedLeadscoreTierABCDE1770000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "leadscore_tier" ("code", "name")
      VALUES
        ('A', 'A'),
        ('B', 'B'),
        ('C', 'C'),
        ('D', 'D'),
        ('E', 'E')
      ON CONFLICT ("code") DO UPDATE
      SET "name" = EXCLUDED."name"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "leadscore_tier" t
      WHERE t."code" IN ('A', 'B', 'C', 'D', 'E')
        AND NOT EXISTS (
          SELECT 1
          FROM "leadscore_tier_rule" r
          WHERE r."tier_id" = t."id"
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "leadscore_result" lr
          WHERE lr."tier_id" = t."id"
        )
    `);
  }
}
