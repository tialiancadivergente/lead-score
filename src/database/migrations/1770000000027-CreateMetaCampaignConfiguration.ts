import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMetaCampaignConfiguration1770000000027
  implements MigrationInterface
{
  name = 'CreateMetaCampaignConfiguration1770000000027';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "meta_campaign_configuration" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "external_campaign_id" text,
        "daily_budget" double precision,
        "total_budget" double precision,
        "objective" text,
        "buying_type" double precision,
        "bid_strategy" text,
        "start_time" TIMESTAMP WITH TIME ZONE,
        "end_time" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_meta_campaign_configuration_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "meta_campaign_configuration"
    `);
  }
}
