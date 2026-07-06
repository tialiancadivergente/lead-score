import { MigrationInterface, QueryRunner } from 'typeorm';

export class CaptureQuizExportIndexes1781900000002 implements MigrationInterface {
  name = 'CaptureQuizExportIndexes1781900000002';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_form_response_capture_id"
      ON "form_response" ("capture_id")
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_form_answer_form_response_id"
      ON "form_answer" ("form_response_id")
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_leadscore_result_form_response_id"
      ON "leadscore_result" ("form_response_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS "IDX_leadscore_result_form_response_id"
    `);

    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS "IDX_form_answer_form_response_id"
    `);

    await queryRunner.query(`
      DROP INDEX CONCURRENTLY IF EXISTS "IDX_form_response_capture_id"
    `);
  }
}
