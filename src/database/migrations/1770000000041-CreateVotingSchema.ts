import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVotingSchema1770000000041 implements MigrationInterface {
  name = 'CreateVotingSchema1770000000041';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "voting_campaign" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "slug" text NOT NULL,
        "name" text NOT NULL,
        "description" text,
        "starts_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "ends_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "status" text NOT NULL DEFAULT 'DRAFT',
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_voting_campaign_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_voting_campaign_slug"
      ON "voting_campaign" ("slug")
    `);

    await queryRunner.query(`
      CREATE TABLE "voting_category" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "campaign_id" uuid NOT NULL,
        "slug" text NOT NULL,
        "name" text NOT NULL,
        "display_order" integer NOT NULL DEFAULT 0,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_voting_category_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_voting_category_campaign_slug"
      ON "voting_category" ("campaign_id", "slug")
    `);

    await queryRunner.query(`
      CREATE TABLE "voting_candidate" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "campaign_id" uuid NOT NULL,
        "category_id" uuid NOT NULL,
        "name" text NOT NULL,
        "story_text" text,
        "photo_url" text NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "display_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_voting_candidate_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_voting_candidate_campaign_active_order"
      ON "voting_candidate" ("campaign_id", "active", "display_order")
    `);

    await queryRunner.query(`
      CREATE TABLE "voting_voter" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" text NOT NULL,
        "email" text NOT NULL,
        "email_normalized" text NOT NULL,
        "phone" text NOT NULL,
        "phone_normalized" text NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_voting_voter_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_voting_voter_email_normalized"
      ON "voting_voter" ("email_normalized")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_voting_voter_phone_normalized"
      ON "voting_voter" ("phone_normalized")
    `);

    await queryRunner.query(`
      CREATE TABLE "voting_vote" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "campaign_id" uuid NOT NULL,
        "candidate_id" uuid NOT NULL,
        "voter_id" uuid NOT NULL,
        "status" text NOT NULL DEFAULT 'VALID',
        "ip_hash" text,
        "user_agent" text,
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_voting_vote_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_voting_vote_campaign"
      ON "voting_vote" ("campaign_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_voting_vote_candidate"
      ON "voting_vote" ("candidate_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_voting_vote_voter"
      ON "voting_vote" ("voter_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_voting_vote_created_at"
      ON "voting_vote" ("created_at")
    `);

    await queryRunner.query(`
      ALTER TABLE "voting_category"
      ADD CONSTRAINT "FK_voting_category_campaign"
      FOREIGN KEY ("campaign_id") REFERENCES "voting_campaign"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "voting_candidate"
      ADD CONSTRAINT "FK_voting_candidate_campaign"
      FOREIGN KEY ("campaign_id") REFERENCES "voting_campaign"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "voting_candidate"
      ADD CONSTRAINT "FK_voting_candidate_category"
      FOREIGN KEY ("category_id") REFERENCES "voting_category"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "voting_vote"
      ADD CONSTRAINT "FK_voting_vote_campaign"
      FOREIGN KEY ("campaign_id") REFERENCES "voting_campaign"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "voting_vote"
      ADD CONSTRAINT "FK_voting_vote_candidate"
      FOREIGN KEY ("candidate_id") REFERENCES "voting_candidate"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "voting_vote"
      ADD CONSTRAINT "FK_voting_vote_voter"
      FOREIGN KEY ("voter_id") REFERENCES "voting_voter"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "voting_vote" DROP CONSTRAINT "FK_voting_vote_voter"
    `);

    await queryRunner.query(`
      ALTER TABLE "voting_vote" DROP CONSTRAINT "FK_voting_vote_candidate"
    `);

    await queryRunner.query(`
      ALTER TABLE "voting_vote" DROP CONSTRAINT "FK_voting_vote_campaign"
    `);

    await queryRunner.query(`
      ALTER TABLE "voting_candidate" DROP CONSTRAINT "FK_voting_candidate_category"
    `);

    await queryRunner.query(`
      ALTER TABLE "voting_candidate" DROP CONSTRAINT "FK_voting_candidate_campaign"
    `);

    await queryRunner.query(`
      ALTER TABLE "voting_category" DROP CONSTRAINT "FK_voting_category_campaign"
    `);

    await queryRunner.query(`DROP INDEX "public"."IDX_voting_vote_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_voting_vote_voter"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_voting_vote_candidate"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_voting_vote_campaign"`);
    await queryRunner.query(`DROP TABLE "voting_vote"`);

    await queryRunner.query(
      `DROP INDEX "public"."IDX_voting_voter_phone_normalized"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_voting_voter_email_normalized"`,
    );
    await queryRunner.query(`DROP TABLE "voting_voter"`);

    await queryRunner.query(
      `DROP INDEX "public"."IDX_voting_candidate_campaign_active_order"`,
    );
    await queryRunner.query(`DROP TABLE "voting_candidate"`);

    await queryRunner.query(
      `DROP INDEX "public"."IDX_voting_category_campaign_slug"`,
    );
    await queryRunner.query(`DROP TABLE "voting_category"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_voting_campaign_slug"`);
    await queryRunner.query(`DROP TABLE "voting_campaign"`);
  }
}
