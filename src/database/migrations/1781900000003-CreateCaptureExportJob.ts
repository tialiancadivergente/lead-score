import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCaptureExportJob1781900000003 implements MigrationInterface {
  name = 'CreateCaptureExportJob1781900000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "capture_export_job" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "format" text NOT NULL,
        "filters" jsonb NOT NULL,
        "status" text NOT NULL DEFAULT 'pending',
        "total_items" integer,
        "processed_items" integer NOT NULL DEFAULT 0,
        "file_name" text,
        "file_data" bytea,
        "error_message" text,
        "started_at" timestamptz,
        "completed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_capture_export_job" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_capture_export_job_status"
      ON "capture_export_job" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_capture_export_job_created_at"
      ON "capture_export_job" ("created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "capture_export_job"`);
  }
}
