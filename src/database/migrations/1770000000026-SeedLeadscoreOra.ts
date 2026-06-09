import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedLeadscoreOra1770000000026 implements MigrationInterface {
  name = 'SeedLeadscoreOra1770000000026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "leadscore" ("id", "form_version_id", "name", "active")
      SELECT
        '24246136-44fb-42e8-ba0b-c68d37fe70bc'::uuid,
        'a9e5538c-ee07-41e4-95a0-862e89adf186'::uuid,
        'leadscore ora',
        true
      WHERE NOT EXISTS (
        SELECT 1
        FROM "leadscore" ls
        WHERE ls."form_version_id" = 'a9e5538c-ee07-41e4-95a0-862e89adf186'::uuid
          AND LOWER(ls."name") = LOWER('leadscore ora')
      )
    `);

    await queryRunner.query(`
      UPDATE "leadscore"
      SET "active" = true
      WHERE "form_version_id" = 'a9e5538c-ee07-41e4-95a0-862e89adf186'::uuid
        AND LOWER("name") = LOWER('leadscore ora')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "leadscore" ls
      WHERE ls."form_version_id" = 'a9e5538c-ee07-41e4-95a0-862e89adf186'::uuid
        AND LOWER(ls."name") = LOWER('leadscore ora')
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
