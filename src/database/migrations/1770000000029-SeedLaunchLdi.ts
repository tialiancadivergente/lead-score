import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedLaunchLdi1770000000029 implements MigrationInterface {
  name = 'SeedLaunchLdi1770000000029';

  private readonly launchId = '0376b485-508b-4343-8fa1-0df6e5a86597';
  private readonly launchName = 'ldi';

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
