import { MigrationInterface, QueryRunner } from 'typeorm';

export class CaptureExportProgress1783300000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE capture_export_job
      ADD COLUMN phase text NOT NULL DEFAULT 'queued',
      ADD COLUMN heartbeat_at timestamptz,
      ADD COLUMN lease_token uuid,
      ADD COLUMN attempt_count integer NOT NULL DEFAULT 0`);
    await runner.query(`UPDATE capture_export_job SET phase = CASE
      WHEN status = 'completed' THEN 'completed'
      WHEN status = 'failed' THEN 'failed'
      WHEN status = 'processing' THEN 'preparing' ELSE 'queued' END`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE capture_export_job DROP COLUMN phase,
      DROP COLUMN heartbeat_at, DROP COLUMN lease_token, DROP COLUMN attempt_count`);
  }
}
