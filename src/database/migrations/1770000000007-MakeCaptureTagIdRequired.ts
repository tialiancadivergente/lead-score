import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeCaptureTagIdRequired1770000000007 implements MigrationInterface {
  name = 'MakeCaptureTagIdRequired1770000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Garante coluna (caso não exista ainda)
    await queryRunner.query(`
      ALTER TABLE "capture"
      ADD COLUMN IF NOT EXISTS "tag_id" text
    `);

    // Preenche legados para permitir NOT NULL
    await queryRunner.query(`
      UPDATE "capture"
      SET "tag_id" = 'legacy'
      WHERE "tag_id" IS NULL OR TRIM("tag_id") = ''
    `);

    await queryRunner.query(`
      ALTER TABLE "capture"
      ALTER COLUMN "tag_id" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "capture"
      ALTER COLUMN "tag_id" DROP NOT NULL
    `);
  }
}
