import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedSeasonMar26ForOraLaunch1770000000020 implements MigrationInterface {
  name = 'SeedSeasonMar26ForOraLaunch1770000000020';

  private readonly seasonId = '5fef4f21-2d2d-4fc2-bfdc-4de3f1094568';
  private readonly launchId = '91ac3c75-4127-4a2a-b0e6-94a6fcbf5e42';
  private readonly seasonName = 'mar26';

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
