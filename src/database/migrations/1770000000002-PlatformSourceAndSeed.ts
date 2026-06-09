import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlatformSourceAndSeed1770000000002 implements MigrationInterface {
  name = 'PlatformSourceAndSeed1770000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "platform"
      ADD COLUMN IF NOT EXISTS "source" text
    `);

    // Seed idempotente (por name). Campo "source" fica nulo por enquanto.
    await queryRunner.query(`
      INSERT INTO "platform" ("name")
      SELECT 'Meta'
      WHERE NOT EXISTS (SELECT 1 FROM "platform" WHERE "name" = 'Meta')
    `);
    await queryRunner.query(`
      INSERT INTO "platform" ("name")
      SELECT 'Google'
      WHERE NOT EXISTS (SELECT 1 FROM "platform" WHERE "name" = 'Google')
    `);
    await queryRunner.query(`
      INSERT INTO "platform" ("name")
      SELECT 'TikTok'
      WHERE NOT EXISTS (SELECT 1 FROM "platform" WHERE "name" = 'TikTok')
    `);
    await queryRunner.query(`
      INSERT INTO "platform" ("name")
      SELECT 'Email'
      WHERE NOT EXISTS (SELECT 1 FROM "platform" WHERE "name" = 'Email')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "platform"
      WHERE "name" IN ('Meta', 'Google', 'TikTok', 'Email')
    `);
    await queryRunner.query(`
      ALTER TABLE "platform"
      DROP COLUMN IF EXISTS "source"
    `);
  }
}
