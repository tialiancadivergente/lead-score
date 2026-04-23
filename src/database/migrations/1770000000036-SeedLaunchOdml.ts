import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedLaunchOdml1770000000036 implements MigrationInterface {
  name = 'SeedLaunchOdml1770000000036';

  private readonly launchId = '3232a2c0-2209-4a40-a79d-63aa51e143fe';
  private readonly launchName = 'odml';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "launch" ("id", "name", "active")
      SELECT '${this.launchId}'::uuid, '${this.launchName}', true
      WHERE NOT EXISTS (
        SELECT 1
        FROM "launch" l
        WHERE LOWER(l."name") = LOWER('${this.launchName}')
      )
    `);

    await queryRunner.query(`
      UPDATE "launch"
      SET "active" = true
      WHERE LOWER("name") = LOWER('${this.launchName}')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "launch"
      WHERE "id" = '${this.launchId}'::uuid
        AND LOWER("name") = LOWER('${this.launchName}')
    `);
  }
}
