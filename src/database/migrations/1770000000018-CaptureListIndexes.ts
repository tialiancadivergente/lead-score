import { MigrationInterface, QueryRunner } from 'typeorm';

export class CaptureListIndexes1770000000018 implements MigrationInterface {
  name = 'CaptureListIndexes1770000000018';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_capture_created_at"
      ON "capture" ("created_at" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_capture_launch_temperature_season_created_at"
      ON "capture" ("launch_id", "temperature_id", "season_id", "created_at" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_person_identifier_person_type_primary_created"
      ON "person_identifier" ("person_id", "identifier_type_id", "is_primary", "created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS "IDX_person_identifier_person_type_primary_created"
    `);

    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS "IDX_capture_launch_temperature_season_created_at"
    `);

    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS "IDX_capture_created_at"
    `);
  }
}
