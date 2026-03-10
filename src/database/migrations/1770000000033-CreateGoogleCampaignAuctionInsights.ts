import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGoogleCampaignAuctionInsights1770000000033
  implements MigrationInterface
{
  name = 'CreateGoogleCampaignAuctionInsights1770000000033';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "google_campaign_auction_insights" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "external_campaign_id" text,
        "domain" text,
        "impression_share" double precision,
        "overlap_rate" double precision,
        "outranking_share" double precision,
        "position_above_rate" double precision,
        "top_of_page_rate" double precision,
        "date" date,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_google_campaign_auction_insights_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "google_campaign_auction_insights"
    `);
  }
}
