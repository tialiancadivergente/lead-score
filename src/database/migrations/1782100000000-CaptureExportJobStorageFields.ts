import { MigrationInterface, QueryRunner } from 'typeorm';

export class CaptureExportJobStorageFields1782100000000 implements MigrationInterface {
  name = 'CaptureExportJobStorageFields1782100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "capture_export_job"
      ADD COLUMN IF NOT EXISTS "file_storage" text,
      ADD COLUMN IF NOT EXISTS "file_path" text,
      ADD COLUMN IF NOT EXISTS "content_type" text,
      ADD COLUMN IF NOT EXISTS "file_size" bigint,
      ADD COLUMN IF NOT EXISTS "expires_at" timestamptz
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "capture_export_job"
      DROP COLUMN IF EXISTS "expires_at",
      DROP COLUMN IF EXISTS "file_size",
      DROP COLUMN IF EXISTS "content_type",
      DROP COLUMN IF EXISTS "file_path",
      DROP COLUMN IF EXISTS "file_storage"
    `);
  }
}
