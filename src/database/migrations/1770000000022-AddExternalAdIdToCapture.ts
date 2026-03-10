import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExternalAdIdToCapture1770000000022
  implements MigrationInterface
{
  name = 'AddExternalAdIdToCapture1770000000022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "capture"
      ADD COLUMN IF NOT EXISTS "external_ad_id" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "capture"
      DROP COLUMN IF EXISTS "external_ad_id"
    `);
  }
}
