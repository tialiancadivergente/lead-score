import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedFormOResgateDosExAliados1770000000021
  implements MigrationInterface
{
  name = 'SeedFormOResgateDosExAliados1770000000021';

  private readonly formId = 'd588a7fc-3110-4fe5-87f2-fc5fbf74b321';
  private readonly formName = 'O Resgate dos Ex-aliados';
  private readonly launchId = '91ac3c75-4127-4a2a-b0e6-94a6fcbf5e42';
  private readonly seasonId = '5fef4f21-2d2d-4fc2-bfdc-4de3f1094568';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "form" ("id", "name", "launch_id", "season_id")
      SELECT
        '${this.formId}'::uuid,
        '${this.formName}',
        '${this.launchId}'::uuid,
        '${this.seasonId}'::uuid
      WHERE NOT EXISTS (
        SELECT 1
        FROM "form" f
        WHERE LOWER(f."name") = LOWER('${this.formName}')
          AND f."launch_id" = '${this.launchId}'::uuid
          AND f."season_id" = '${this.seasonId}'::uuid
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "form" f
      WHERE LOWER(f."name") = LOWER('${this.formName}')
        AND f."launch_id" = '${this.launchId}'::uuid
        AND f."season_id" = '${this.seasonId}'::uuid
        AND NOT EXISTS (
          SELECT 1
          FROM "form_version" fv
          WHERE fv."form_id" = f."id"
        )
    `);
  }
}
