import { MigrationInterface, QueryRunner } from 'typeorm';

export class LeadScoreFormResponseRequestIdIndex1782000000003
  implements MigrationInterface
{
  name = 'LeadScoreFormResponseRequestIdIndex1782000000003';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_form_response_raw_payload_request_id_created_at"
      ON "form_response" ((raw_payload ->> 'requestId'), "created_at" DESC)
      WHERE raw_payload ? 'requestId'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS "IDX_form_response_raw_payload_request_id_created_at"
    `);
  }
}
