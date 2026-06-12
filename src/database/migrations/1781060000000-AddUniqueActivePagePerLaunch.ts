import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueActivePagePerLaunch1781060000000
  implements MigrationInterface
{
  name = 'AddUniqueActivePagePerLaunch1781060000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_page_active_launch"
      ON "page" ("launch_id")
      WHERE "active" = true AND "launch_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_page_active_launch"`);
  }
}
