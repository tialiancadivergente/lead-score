import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdSet1770000000020 implements MigrationInterface {
  name = 'CreateAdSet1770000000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ad_set" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "campaign_id" uuid,
        "name" text,
        "external_adset_id" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ad_set_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "ad_set"
      ADD CONSTRAINT "FK_ad_set_campaign"
      FOREIGN KEY ("campaign_id") REFERENCES "campaign"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ad_set"
      DROP CONSTRAINT "FK_ad_set_campaign"
    `);

    await queryRunner.query(`
      DROP TABLE "ad_set"
    `);
  }
}
