import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOAuthTables1770000000036 implements MigrationInterface {
  name = 'CreateOAuthTables1770000000036';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "oauth_connection" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "provider" text NOT NULL,
        "user_id" uuid,
        "status" text NOT NULL DEFAULT 'active',
        "external_user_id" text,
        "external_user_email" text,
        "external_account_id" text,
        "external_account_name" text,
        "access_token" text,
        "refresh_token" text,
        "token_type" text,
        "scopes" text array,
        "expires_at" TIMESTAMP WITH TIME ZONE,
        "connected_at" TIMESTAMP WITH TIME ZONE,
        "last_refreshed_at" TIMESTAMP WITH TIME ZONE,
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_oauth_connection_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_oauth_connection_provider"
      ON "oauth_connection" ("provider")
    `);

    await queryRunner.query(`
      CREATE TABLE "oauth_state" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "state" text NOT NULL,
        "provider" text NOT NULL,
        "user_id" uuid,
        "status" text NOT NULL DEFAULT 'pending',
        "callback_url" text NOT NULL,
        "frontend_redirect_url" text,
        "scopes" text array,
        "context" jsonb,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "consumed_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_oauth_state_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_oauth_state_state" UNIQUE ("state")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_oauth_state_provider"
      ON "oauth_state" ("provider")
    `);

    await queryRunner.query(`
      ALTER TABLE "oauth_connection"
      ADD CONSTRAINT "FK_oauth_connection_user"
      FOREIGN KEY ("user_id") REFERENCES "user"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "oauth_state"
      ADD CONSTRAINT "FK_oauth_state_user"
      FOREIGN KEY ("user_id") REFERENCES "user"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "oauth_state"
      DROP CONSTRAINT "FK_oauth_state_user"
    `);

    await queryRunner.query(`
      ALTER TABLE "oauth_connection"
      DROP CONSTRAINT "FK_oauth_connection_user"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_oauth_state_provider"
    `);

    await queryRunner.query(`
      DROP TABLE "oauth_state"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_oauth_connection_provider"
    `);

    await queryRunner.query(`
      DROP TABLE "oauth_connection"
    `);
  }
}
