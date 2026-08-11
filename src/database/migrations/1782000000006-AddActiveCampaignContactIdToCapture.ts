import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActiveCampaignContactIdToCapture1782000000006
  implements MigrationInterface
{
  name = 'AddActiveCampaignContactIdToCapture1782000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "capture"
      ADD COLUMN IF NOT EXISTS "activecampaign_contact_id" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "capture"
      DROP COLUMN IF EXISTS "activecampaign_contact_id"
    `);
  }
}
