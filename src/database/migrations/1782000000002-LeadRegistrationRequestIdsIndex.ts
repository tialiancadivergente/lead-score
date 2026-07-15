import { MigrationInterface, QueryRunner } from 'typeorm';

export class LeadRegistrationRequestIdsIndex1782000000002 implements MigrationInterface {
  name = 'LeadRegistrationRequestIdsIndex1782000000002';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_capture_metadata_lead_registration_request_ids"
      ON "capture" USING GIN ((metadata -> 'leadRegistrationRequestIds'))
      WHERE metadata ? 'leadRegistrationRequestIds'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS "IDX_capture_metadata_lead_registration_request_ids"
    `);
  }
}
