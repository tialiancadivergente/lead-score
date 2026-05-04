import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExternalCampaignIdToCampaign1770000000019
  implements MigrationInterface
{
  name = 'AddExternalCampaignIdToCampaign1770000000019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "campaign"
      ADD COLUMN IF NOT EXISTS "external_campaign_id" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "campaign"
      DROP COLUMN IF EXISTS "external_campaign_id"
    `);
  }
}
