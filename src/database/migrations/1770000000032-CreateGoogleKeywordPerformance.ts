import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGoogleKeywordPerformance1770000000032
  implements MigrationInterface
{
  name = 'CreateGoogleKeywordPerformance1770000000032';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "google_keyword_performance" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "external_adset_id" text,
        "keyword_id" text,
        "text" text,
        "match_type" text,
        "quality_score" integer,
        "spend" double precision,
        "clicks" integer,
        "conversions" double precision,
        "date" date,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_google_keyword_performance_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "google_keyword_performance"
    `);
  }
}
