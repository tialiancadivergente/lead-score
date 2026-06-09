import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedSeason2026ForOdmlLaunch1770000000037 implements MigrationInterface {
  name = 'SeedSeason2026ForOdmlLaunch1770000000037';

  private readonly seasonId = '6839a5b3-d1c4-4b02-8c73-4a04cf0337f2';
  private readonly launchId = '3232a2c0-2209-4a40-a79d-63aa51e143fe';
  private readonly seasonName = '2026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "season" ("id", "name", "active", "launch_id")
      SELECT '${this.seasonId}'::uuid, '${this.seasonName}', true, '${this.launchId}'::uuid
      WHERE NOT EXISTS (
        SELECT 1
        FROM "season" s
        WHERE s."launch_id" = '${this.launchId}'::uuid
          AND LOWER(s."name") = LOWER('${this.seasonName}')
      )
    `);

    await queryRunner.query(`
      UPDATE "season"
      SET "active" = true
      WHERE "launch_id" = '${this.launchId}'::uuid
        AND LOWER("name") = LOWER('${this.seasonName}')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "season"
      WHERE "id" = '${this.seasonId}'::uuid
        AND "launch_id" = '${this.launchId}'::uuid
        AND LOWER("name") = LOWER('${this.seasonName}')
    `);
  }
}
