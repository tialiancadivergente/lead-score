import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedSeasonAbr26ForLdiLaunch1770000000030
  implements MigrationInterface
{
  name = 'SeedSeasonAbr26ForLdiLaunch1770000000030';

  private readonly seasonId = '869dac13-6e0c-41a5-9964-a5ffd8ad63c1';
  private readonly launchId = '0376b485-508b-4343-8fa1-0df6e5a86597';
  private readonly seasonName = 'abr26';

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
