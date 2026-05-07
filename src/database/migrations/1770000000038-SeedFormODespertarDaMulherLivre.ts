import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedFormODespertarDaMulherLivre1770000000038
  implements MigrationInterface
{
  name = 'SeedFormODespertarDaMulherLivre1770000000038';

  private readonly formName = 'O Despertar da Mulher Livre';
  private readonly launchId = '3232a2c0-2209-4a40-a79d-63aa51e143fe';
  private readonly seasonId = '6839a5b3-d1c4-4b02-8c73-4a04cf0337f2';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "form" ("id", "name", "launch_id", "season_id")
      SELECT
        'afb32866-0270-4c0c-a37b-ac654f4e234d'::uuid,
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
