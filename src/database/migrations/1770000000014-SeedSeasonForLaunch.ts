import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedSeasonForLaunch1770000000014 implements MigrationInterface {
  name = 'SeedSeasonForLaunch1770000000014';

  private readonly launchId = '4c88a392-6e6f-417e-822a-5be7221900fd';
  private readonly seasonName = 'nov26';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "season" ("name", "active", "launch_id")
      SELECT '${this.seasonName}', true, '${this.launchId}'::uuid
      WHERE NOT EXISTS (
        SELECT 1
        FROM "season" s
        WHERE s."launch_id" = '${this.launchId}'::uuid
          AND LOWER(s."name") = LOWER('${this.seasonName}')
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "season"
      WHERE "launch_id" = '${this.launchId}'::uuid
        AND LOWER("name") = LOWER('${this.seasonName}')
    `);
  }
}
