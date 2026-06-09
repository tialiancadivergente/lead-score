import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInleadWebhookActivecampaignLog1770000000060 implements MigrationInterface {
  name = 'CreateInleadWebhookActivecampaignLog1770000000060';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inlead_webhook_activecampaign_log" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" text,
        "telefone" text,
        "telefone_normalizado" text,
        "launch" text NOT NULL,
        "season" text NOT NULL,
        "tag_name" text NOT NULL,
        "tag_id" text NOT NULL,
        "page" text,
        "path" text,
        "referer" text,
        "ip" text,
        "user_agent" text,
        "utm_source" text,
        "utm_medium" text,
        "utm_campaign" text,
        "utm_id" text,
        "utm_term" text,
        "utm_content" text,
        "external_code" text,
        "external_score" integer,
        "raw_payload" jsonb NOT NULL,
        "normalized_payload" jsonb NOT NULL,
        "activecampaign_response" jsonb,
        "status" text NOT NULL DEFAULT 'received',
        "error_message" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "sent_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_inlead_webhook_activecampaign_log" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inlead_webhook_ac_email"
      ON "inlead_webhook_activecampaign_log" ("email")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inlead_webhook_ac_telefone_normalizado"
      ON "inlead_webhook_activecampaign_log" ("telefone_normalizado")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inlead_webhook_ac_created_at"
      ON "inlead_webhook_activecampaign_log" ("created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inlead_webhook_ac_status"
      ON "inlead_webhook_activecampaign_log" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_inlead_webhook_ac_status"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_inlead_webhook_ac_created_at"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_inlead_webhook_ac_telefone_normalizado"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_inlead_webhook_ac_email"
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "inlead_webhook_activecampaign_log"
    `);
  }
}
