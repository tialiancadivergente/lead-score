import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAd1770000000021 implements MigrationInterface {
  name = 'CreateAd1770000000021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ad" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "ad_set_id" uuid,
        "name" text,
        "external_ad_id" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ad_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "ad"
      ADD CONSTRAINT "FK_ad_ad_set"
      FOREIGN KEY ("ad_set_id") REFERENCES "ad_set"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ad"
      DROP CONSTRAINT "FK_ad_ad_set"
    `);

    await queryRunner.query(`
      DROP TABLE "ad"
    `);
  }
}
