import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedLeadscoreOro1770000000010 implements MigrationInterface {
  name = 'SeedLeadscoreOro1770000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "leadscore" ("form_version_id", "name", "active")
      SELECT
        '2f76bc57-57a2-41fd-9c2c-18a726dd4fe0'::uuid,
        'leadscore oro',
        true
      WHERE NOT EXISTS (
        SELECT 1
        FROM "leadscore" ls
        WHERE ls."form_version_id" = '2f76bc57-57a2-41fd-9c2c-18a726dd4fe0'::uuid
          AND LOWER(ls."name") = LOWER('leadscore oro')
      )
    `);

    await queryRunner.query(`
      UPDATE "leadscore"
      SET "active" = true
      WHERE "form_version_id" = '2f76bc57-57a2-41fd-9c2c-18a726dd4fe0'::uuid
        AND LOWER("name") = LOWER('leadscore oro')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "leadscore" ls
      WHERE ls."form_version_id" = '2f76bc57-57a2-41fd-9c2c-18a726dd4fe0'::uuid
        AND LOWER(ls."name") = LOWER('leadscore oro')
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
