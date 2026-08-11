import { MigrationInterface, QueryRunner } from 'typeorm';

export class LeadScoreCaptureRequestIdsLookupIndex1782000000004
  implements MigrationInterface
{
  name = 'LeadScoreCaptureRequestIdsLookupIndex1782000000004';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_capture_metadata_lead_registration_request_ids_lookup"
      ON "capture" USING GIN ((metadata -> 'leadRegistrationRequestIds'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS "IDX_capture_metadata_lead_registration_request_ids_lookup"
    `);
  }
}
