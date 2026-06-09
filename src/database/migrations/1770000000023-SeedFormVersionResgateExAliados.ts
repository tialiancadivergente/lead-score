import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedFormVersionResgateExAliados1770000000023 implements MigrationInterface {
  name = 'SeedFormVersionResgateExAliados1770000000023';

  private readonly formVersionId = 'a9e5538c-ee07-41e4-95a0-862e89adf186';
  private readonly formId = 'd588a7fc-3110-4fe5-87f2-fc5fbf74b321';
  private readonly versionNumber = 1;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "form_version" ("id", "form_id", "version_number", "active")
      SELECT
        '${this.formVersionId}'::uuid,
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
