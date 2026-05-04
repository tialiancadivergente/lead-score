import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAccountPlatform1770000000018 implements MigrationInterface {
  name = 'CreateAccountPlatform1770000000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "account_platform" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "platform_id" uuid,
        "name" text,
        "external_account_id" text,
        "parent_external_id" text,
        "status" text,
        "token" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_account_platform_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "account_platform"
      ADD CONSTRAINT "FK_account_platform_platform"
      FOREIGN KEY ("platform_id") REFERENCES "platform"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "account_platform"
      DROP CONSTRAINT "FK_account_platform_platform"
    `);

    await queryRunner.query(`
      DROP TABLE "account_platform"
    `);
  }
}
