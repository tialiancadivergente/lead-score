import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedFormVersionODespertarDaMulherLivre1770000000039
  implements MigrationInterface
{
  name = 'SeedFormVersionODespertarDaMulherLivre1770000000039';

  private readonly formId = 'afb32866-0270-4c0c-a37b-ac654f4e234d';
  private readonly versionNumber = 1;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "form_version" ("form_id", "version_number", "active")
      SELECT
        '${this.formId}'::uuid,
        ${this.versionNumber},
        true
      WHERE NOT EXISTS (
        SELECT 1
        FROM "form_version" fv
        WHERE fv."form_id" = '${this.formId}'::uuid
          AND fv."version_number" = ${this.versionNumber}
      )
    `);

    await queryRunner.query(`
      UPDATE "form_version"
      SET "active" = true
      WHERE "form_id" = '${this.formId}'::uuid
        AND "version_number" = ${this.versionNumber}
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "form_version" fv
      WHERE fv."form_id" = '${this.formId}'::uuid
        AND fv."version_number" = ${this.versionNumber}
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
