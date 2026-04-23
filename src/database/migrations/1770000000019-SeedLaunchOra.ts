import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedLaunchOra1770000000019 implements MigrationInterface {
  name = 'SeedLaunchOra1770000000019';

  private readonly launchId = '91ac3c75-4127-4a2a-b0e6-94a6fcbf5e42';
  private readonly launchName = 'ora';

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
