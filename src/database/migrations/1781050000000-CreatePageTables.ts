import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePageTables1781050000000 implements MigrationInterface {
  name = 'CreatePageTables1781050000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "page" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "abbreviation" text NOT NULL,
        "name" text NOT NULL,
        "launch_id" uuid,
        "season_id" uuid,
        "form_id" uuid NOT NULL,
        "form_version_id" uuid NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_page_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_page_abbreviation" UNIQUE ("abbreviation")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "page_headline" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "page_id" uuid NOT NULL,
        "abbreviation" text NOT NULL,
        "content" text NOT NULL,
        "position" integer NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_page_headline_id" PRIMARY KEY ("id"),
        CONSTRAINT "uq_page_headline_abbreviation" UNIQUE ("page_id", "abbreviation"),
        CONSTRAINT "uq_page_headline_position" UNIQUE ("page_id", "position")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "page_version" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "page_id" uuid NOT NULL,
        "abbreviation" text NOT NULL,
        "version_number" integer NOT NULL,
        "template_image_url" text,
        "template_url" text,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_page_version_id" PRIMARY KEY ("id"),
        CONSTRAINT "uq_page_version_abbreviation" UNIQUE ("page_id", "abbreviation"),
        CONSTRAINT "uq_page_version_number" UNIQUE ("page_id", "version_number")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "page_temperature" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "page_id" uuid NOT NULL,
        "temperature_id" uuid NOT NULL,
        "tag_id" text NOT NULL,
        "redirect_url" text NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_page_temperature_id" PRIMARY KEY ("id"),
        CONSTRAINT "uq_page_temperature_temperature" UNIQUE ("page_id", "temperature_id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "page"
      ADD CONSTRAINT "FK_page_launch" FOREIGN KEY ("launch_id") REFERENCES "launch"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "page"
      ADD CONSTRAINT "FK_page_season" FOREIGN KEY ("season_id") REFERENCES "season"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "page"
      ADD CONSTRAINT "FK_page_form" FOREIGN KEY ("form_id") REFERENCES "form"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "page"
      ADD CONSTRAINT "FK_page_form_version" FOREIGN KEY ("form_version_id") REFERENCES "form_version"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_page_active_launch"
      ON "page" ("launch_id")
      WHERE "active" = true AND "launch_id" IS NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "page_headline"
      ADD CONSTRAINT "FK_page_headline_page" FOREIGN KEY ("page_id") REFERENCES "page"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "page_version"
      ADD CONSTRAINT "FK_page_version_page" FOREIGN KEY ("page_id") REFERENCES "page"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "page_temperature"
      ADD CONSTRAINT "FK_page_temperature_page" FOREIGN KEY ("page_id") REFERENCES "page"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "page_temperature"
      ADD CONSTRAINT "FK_page_temperature_temperature" FOREIGN KEY ("temperature_id") REFERENCES "temperature"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "page_temperature" DROP CONSTRAINT "FK_page_temperature_temperature"`,
    );
    await queryRunner.query(
      `ALTER TABLE "page_temperature" DROP CONSTRAINT "FK_page_temperature_page"`,
    );
    await queryRunner.query(
      `ALTER TABLE "page_version" DROP CONSTRAINT "FK_page_version_page"`,
    );
    await queryRunner.query(
      `ALTER TABLE "page_headline" DROP CONSTRAINT "FK_page_headline_page"`,
    );
    await queryRunner.query(
      `ALTER TABLE "page" DROP CONSTRAINT "FK_page_form_version"`,
    );
    await queryRunner.query(`DROP INDEX "UQ_page_active_launch"`);
    await queryRunner.query(
      `ALTER TABLE "page" DROP CONSTRAINT "FK_page_form"`,
    );
    await queryRunner.query(
      `ALTER TABLE "page" DROP CONSTRAINT "FK_page_season"`,
    );
    await queryRunner.query(
      `ALTER TABLE "page" DROP CONSTRAINT "FK_page_launch"`,
    );
    await queryRunner.query(`DROP TABLE "page_temperature"`);
    await queryRunner.query(`DROP TABLE "page_version"`);
    await queryRunner.query(`DROP TABLE "page_headline"`);
    await queryRunner.query(`DROP TABLE "page"`);
  }
}
