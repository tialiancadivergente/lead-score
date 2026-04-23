import { MigrationInterface, QueryRunner } from 'typeorm';

export class CaptureTagId1770000000005 implements MigrationInterface {
  name = 'CaptureTagId1770000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "capture"
      ADD COLUMN IF NOT EXISTS "tag_id" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "capture"
      DROP COLUMN IF EXISTS "tag_id"
    `);
  }
}
