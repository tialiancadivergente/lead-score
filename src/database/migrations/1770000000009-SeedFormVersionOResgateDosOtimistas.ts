import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedFormVersionOResgateDosOtimistas1770000000009
  implements MigrationInterface
{
  name = 'SeedFormVersionOResgateDosOtimistas1770000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "form_version" ("form_id", "version_number", "active")
      SELECT
        '7405904f-64b9-4b2e-a067-a5fa246e1d55'::uuid,
        1,
        true
      WHERE NOT EXISTS (
        SELECT 1
        FROM "form_version" fv
        WHERE fv."form_id" = '7405904f-64b9-4b2e-a067-a5fa246e1d55'::uuid
          AND fv."version_number" = 1
      )
    `);

    await queryRunner.query(`
      UPDATE "form_version"
      SET "active" = true
      WHERE "form_id" = '7405904f-64b9-4b2e-a067-a5fa246e1d55'::uuid
        AND "version_number" = 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "form_version" fv
      WHERE fv."form_id" = '7405904f-64b9-4b2e-a067-a5fa246e1d55'::uuid
        AND fv."version_number" = 1
        AND NOT EXISTS (
          SELECT 1
          FROM "form_response" fr
          WHERE fr."form_version_id" = fv."id"
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "capture" c
          WHERE c."form_version_id" = fv."id"
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "form_version_question" fvq
          WHERE fvq."form_version_id" = fv."id"
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "leadscore" ls
          WHERE ls."form_version_id" = fv."id"
        )
    `);
  }
}
