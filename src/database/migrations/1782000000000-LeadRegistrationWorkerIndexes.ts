import { MigrationInterface, QueryRunner } from 'typeorm';

export class LeadRegistrationWorkerIndexes1782000000000
  implements MigrationInterface
{
  name = 'LeadRegistrationWorkerIndexes1782000000000';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_person_identifier_value_hash_identifier_type"
      ON "person_identifier" ("value_hash", "identifier_type_id")
      WHERE "value_hash" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_capture_metadata_request_id_created_at"
      ON "capture" ((metadata ->> 'requestId'), "created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS "IDX_capture_metadata_request_id_created_at"
    `);

    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS "IDX_person_identifier_value_hash_identifier_type"
    `);
  }
}
