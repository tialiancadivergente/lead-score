import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthRateLimitBuckets1783200000000
  implements MigrationInterface
{
  name = 'CreateAuthRateLimitBuckets1783200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS auth_rate_limits (
        "key" varchar(240) PRIMARY KEY,
        "count" integer NOT NULL DEFAULT 0,
        "reset_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_reset_at
      ON auth_rate_limits ("reset_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS auth_rate_limits`);
  }
}
