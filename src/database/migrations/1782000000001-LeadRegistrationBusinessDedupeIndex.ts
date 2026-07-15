import { MigrationInterface, QueryRunner } from 'typeorm';

export class LeadRegistrationBusinessDedupeIndex1782000000001 implements MigrationInterface {
  name = 'LeadRegistrationBusinessDedupeIndex1782000000001';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_capture_metadata_lead_registration_dedupe_created_at"
      ON "capture" ((metadata ->> 'leadRegistrationDedupeKey'), "created_at" DESC)
      WHERE metadata ? 'leadRegistrationDedupeKey'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS "IDX_capture_metadata_lead_registration_dedupe_created_at"
    `);
  }
}
