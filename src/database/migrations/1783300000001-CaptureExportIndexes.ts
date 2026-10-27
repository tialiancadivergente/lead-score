import { MigrationInterface, QueryRunner } from 'typeorm';

export class CaptureExportIndexes1783300000001 implements MigrationInterface {
  transaction = false;

  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_capture_export_launch_cursor"
      ON capture (launch_id, created_at DESC, id DESC)`);
    await runner.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_capture_export_cursor"
      ON capture (created_at DESC, id DESC)`);
    await runner.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_export_response_latest"
      ON form_response (capture_id, submitted_at DESC NULLS LAST, created_at DESC, id DESC)`);
    await runner.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_export_score_response"
      ON leadscore_result (form_response_id, created_at DESC)`);
  }

  async down(runner: QueryRunner): Promise<void> {
    for (const name of [
      'IDX_capture_export_launch_cursor',
      'IDX_capture_export_cursor',
      'IDX_export_response_latest',
      'IDX_export_score_response',
    ]) {
      await runner.query(`DROP INDEX CONCURRENTLY IF EXISTS "${name}"`);
    }
  }
}
