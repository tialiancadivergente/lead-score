import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedFormOLevanteDosImprovaveis1770000000031
  implements MigrationInterface
{
  name = 'SeedFormOLevanteDosImprovaveis1770000000031';

  private readonly formName = 'O Levante dos Improvaveis';
  private readonly launchId = '0376b485-508b-4343-8fa1-0df6e5a86597';
  private readonly seasonId = '869dac13-6e0c-41a5-9964-a5ffd8ad63c1';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "form" ("name", "launch_id", "season_id")
      SELECT
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
