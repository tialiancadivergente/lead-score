import { MigrationInterface, QueryRunner } from 'typeorm';

export class TemperatureAbbreviationAndSeed1770000000001 implements MigrationInterface {
  name = 'TemperatureAbbreviationAndSeed1770000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "temperature"
      ADD COLUMN IF NOT EXISTS "abbreviation" text
    `);

    // Seed idempotente
    await queryRunner.query(`
      INSERT INTO "temperature" ("abbreviation", "name")
      SELECT 'F', 'Frio'
      WHERE NOT EXISTS (
        SELECT 1 FROM "temperature" WHERE "abbreviation" = 'F'
      )
    `);
    await queryRunner.query(`
      INSERT INTO "temperature" ("abbreviation", "name")
      SELECT 'm', 'Morno'
      WHERE NOT EXISTS (
        SELECT 1 FROM "temperature" WHERE "abbreviation" = 'm'
      )
    `);
    await queryRunner.query(`
      INSERT INTO "temperature" ("abbreviation", "name")
      SELECT 'q', 'Quente'
      WHERE NOT EXISTS (
        SELECT 1 FROM "temperature" WHERE "abbreviation" = 'q'
      )
    `);
    await queryRunner.query(`
      INSERT INTO "temperature" ("abbreviation", "name")
      SELECT 'org', 'Orgânico'
      WHERE NOT EXISTS (
        SELECT 1 FROM "temperature" WHERE "abbreviation" = 'org'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "temperature"
      WHERE "abbreviation" IN ('F', 'm', 'q', 'org')
    `);
    await queryRunner.query(`
      ALTER TABLE "temperature"
      DROP COLUMN IF EXISTS "abbreviation"
    `);
  }
}
