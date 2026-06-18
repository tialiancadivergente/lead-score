import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserEmailVerifiedAt1781900000001
  implements MigrationInterface
{
  name = 'AddUserEmailVerifiedAt1781900000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "email_verified_at" TIMESTAMP WITH TIME ZONE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "email_verified_at"
    `);
  }
}
