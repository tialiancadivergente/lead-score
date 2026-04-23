import { MigrationInterface, QueryRunner } from 'typeorm';

export class CopyFormStructureFromOtimistasToOdmlDespertar1770000000040
  implements MigrationInterface
{
  name = 'CopyFormStructureFromOtimistasToOdmlDespertar1770000000040';

  private readonly sourceFormId = '7405904f-64b9-4b2e-a067-a5fa246e1d55';
  private readonly sourceFormVersionId = '2f76bc57-57a2-41fd-9c2c-18a726dd4fe0';
  private readonly targetFormId = 'afb32866-0270-4c0c-a37b-ac654f4e234d';
  private readonly targetFormVersionId = '6ae28205-2f33-4ddc-acba-26cf4f4321d3';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM "form" f
          WHERE f."id" = '${this.sourceFormId}'::uuid
        ) THEN
          RAISE EXCEPTION 'Source form not found: %', '${this.sourceFormId}';
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM "form" f
          WHERE f."id" = '${this.targetFormId}'::uuid
        ) THEN
          RAISE EXCEPTION 'Target form not found: %', '${this.targetFormId}';
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM "form_version" fv
          WHERE fv."id" = '${this.sourceFormVersionId}'::uuid
            AND fv."form_id" = '${this.sourceFormId}'::uuid
        ) THEN
          RAISE EXCEPTION 'Source form_version not found for source form: %', '${this.sourceFormVersionId}';
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM "form_version" fv
          WHERE fv."id" = '${this.targetFormVersionId}'::uuid
            AND fv."form_id" = '${this.targetFormId}'::uuid
        ) THEN
          RAISE EXCEPTION 'Target form_version not found for target form: %', '${this.targetFormVersionId}';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      WITH source_questions AS (
        SELECT
          q."question_key",
          q."question_text",
          q."input_type"
        FROM "question" q
        WHERE q."form_id" = '${this.sourceFormId}'::uuid
      )
      INSERT INTO "question" ("form_id", "question_key", "question_text", "input_type")
      SELECT
        '${this.targetFormId}'::uuid,
        sq."question_key",
        sq."question_text",
        sq."input_type"
      FROM source_questions sq
      WHERE NOT EXISTS (
        SELECT 1
        FROM "question" tq
        WHERE tq."form_id" = '${this.targetFormId}'::uuid
          AND tq."question_key" = sq."question_key"
      )
    `);

    await queryRunner.query(`
      UPDATE "question" tq
      SET
        "question_text" = sq."question_text",
        "input_type" = sq."input_type"
      FROM "question" sq
      WHERE sq."form_id" = '${this.sourceFormId}'::uuid
        AND tq."form_id" = '${this.targetFormId}'::uuid
        AND tq."question_key" = sq."question_key"
    `);

    await queryRunner.query(`
      WITH source_links AS (
        SELECT
          sq."question_key",
          sfvq."display_order",
          sfvq."required"
        FROM "form_version_question" sfvq
        INNER JOIN "question" sq
          ON sq."id" = sfvq."question_id"
        WHERE sfvq."form_version_id" = '${this.sourceFormVersionId}'::uuid
          AND sq."form_id" = '${this.sourceFormId}'::uuid
      )
      INSERT INTO "form_version_question" ("form_version_id", "question_id", "display_order", "required")
      SELECT
        '${this.targetFormVersionId}'::uuid,
        tq."id",
        sl."display_order",
        sl."required"
      FROM source_links sl
      INNER JOIN "question" tq
        ON tq."form_id" = '${this.targetFormId}'::uuid
       AND tq."question_key" = sl."question_key"
      WHERE NOT EXISTS (
        SELECT 1
        FROM "form_version_question" tfvq
        WHERE tfvq."form_version_id" = '${this.targetFormVersionId}'::uuid
          AND tfvq."question_id" = tq."id"
      )
    `);

    await queryRunner.query(`
      WITH source_links AS (
        SELECT
          sq."question_key",
          sfvq."display_order",
          sfvq."required"
        FROM "form_version_question" sfvq
        INNER JOIN "question" sq
          ON sq."id" = sfvq."question_id"
        WHERE sfvq."form_version_id" = '${this.sourceFormVersionId}'::uuid
          AND sq."form_id" = '${this.sourceFormId}'::uuid
      )
      UPDATE "form_version_question" tfvq
      SET
        "display_order" = sl."display_order",
        "required" = sl."required"
      FROM source_links sl
      INNER JOIN "question" tq
        ON tq."form_id" = '${this.targetFormId}'::uuid
       AND tq."question_key" = sl."question_key"
      WHERE tfvq."form_version_id" = '${this.targetFormVersionId}'::uuid
        AND tfvq."question_id" = tq."id"
    `);

    await queryRunner.query(`
      WITH source_options AS (
        SELECT
          sq."question_key",
          sqo."option_key",
          sqo."option_text",
          sqo."display_order"
        FROM "question_option" sqo
        INNER JOIN "question" sq
          ON sq."id" = sqo."question_id"
        WHERE sq."form_id" = '${this.sourceFormId}'::uuid
      )
      INSERT INTO "question_option" ("question_id", "option_key", "option_text", "display_order")
      SELECT
        tq."id",
        so."option_key",
        so."option_text",
        so."display_order"
      FROM source_options so
      INNER JOIN "question" tq
        ON tq."form_id" = '${this.targetFormId}'::uuid
       AND tq."question_key" = so."question_key"
      WHERE NOT EXISTS (
        SELECT 1
        FROM "question_option" tqo
        WHERE tqo."question_id" = tq."id"
          AND tqo."option_key" = so."option_key"
      )
    `);

    await queryRunner.query(`
      WITH source_options AS (
        SELECT
          sq."question_key",
          sqo."option_key",
          sqo."option_text",
          sqo."display_order"
        FROM "question_option" sqo
        INNER JOIN "question" sq
          ON sq."id" = sqo."question_id"
        WHERE sq."form_id" = '${this.sourceFormId}'::uuid
      )
      UPDATE "question_option" tqo
      SET
        "option_text" = so."option_text",
        "display_order" = so."display_order"
      FROM source_options so
      INNER JOIN "question" tq
        ON tq."form_id" = '${this.targetFormId}'::uuid
       AND tq."question_key" = so."question_key"
      WHERE tqo."question_id" = tq."id"
        AND tqo."option_key" = so."option_key"
    `);

    await queryRunner.query(`
      WITH source_leadscores AS (
        SELECT
          ls."name",
          ls."active"
        FROM "leadscore" ls
        WHERE ls."form_version_id" = '${this.sourceFormVersionId}'::uuid
      )
      INSERT INTO "leadscore" ("form_version_id", "name", "active")
      SELECT
        '${this.targetFormVersionId}'::uuid,
        sl."name",
        sl."active"
      FROM source_leadscores sl
      WHERE NOT EXISTS (
        SELECT 1
        FROM "leadscore" tl
        WHERE tl."form_version_id" = '${this.targetFormVersionId}'::uuid
          AND LOWER(tl."name") = LOWER(sl."name")
      )
    `);

    await queryRunner.query(`
      UPDATE "leadscore" tl
      SET "active" = sl."active"
      FROM "leadscore" sl
      WHERE sl."form_version_id" = '${this.sourceFormVersionId}'::uuid
        AND tl."form_version_id" = '${this.targetFormVersionId}'::uuid
        AND LOWER(tl."name") = LOWER(sl."name")
    `);

    await queryRunner.query(`
      WITH source_rules AS (
        SELECT
          sl."name" AS "leadscore_name",
          ltr."tier_id",
          ltr."min_score",
          ltr."max_score"
        FROM "leadscore_tier_rule" ltr
        INNER JOIN "leadscore" sl
          ON sl."id" = ltr."leadscore_id"
        WHERE sl."form_version_id" = '${this.sourceFormVersionId}'::uuid
      ),
      mapped_target AS (
        SELECT
          tl."id" AS "target_leadscore_id",
          sr."tier_id",
          sr."min_score",
          sr."max_score"
        FROM source_rules sr
        INNER JOIN "leadscore" tl
          ON tl."form_version_id" = '${this.targetFormVersionId}'::uuid
         AND LOWER(tl."name") = LOWER(sr."leadscore_name")
      )
      INSERT INTO "leadscore_tier_rule" ("leadscore_id", "tier_id", "min_score", "max_score")
      SELECT
        mt."target_leadscore_id",
        mt."tier_id",
        mt."min_score",
        mt."max_score"
      FROM mapped_target mt
      WHERE NOT EXISTS (
        SELECT 1
        FROM "leadscore_tier_rule" tltr
        WHERE tltr."leadscore_id" = mt."target_leadscore_id"
          AND tltr."tier_id" = mt."tier_id"
      )
    `);

    await queryRunner.query(`
      WITH source_rules AS (
        SELECT
          sl."name" AS "leadscore_name",
          ltr."tier_id",
          ltr."min_score",
          ltr."max_score"
        FROM "leadscore_tier_rule" ltr
        INNER JOIN "leadscore" sl
          ON sl."id" = ltr."leadscore_id"
        WHERE sl."form_version_id" = '${this.sourceFormVersionId}'::uuid
      ),
      mapped_target AS (
        SELECT
          tl."id" AS "target_leadscore_id",
          sr."tier_id",
          sr."min_score",
          sr."max_score"
        FROM source_rules sr
        INNER JOIN "leadscore" tl
          ON tl."form_version_id" = '${this.targetFormVersionId}'::uuid
         AND LOWER(tl."name") = LOWER(sr."leadscore_name")
      )
      UPDATE "leadscore_tier_rule" tltr
      SET
        "min_score" = mt."min_score",
        "max_score" = mt."max_score"
      FROM mapped_target mt
      WHERE tltr."leadscore_id" = mt."target_leadscore_id"
        AND tltr."tier_id" = mt."tier_id"
    `);

    await queryRunner.query(`
      WITH source_points AS (
        SELECT
          sl."name" AS "leadscore_name",
          sq."question_key",
          sqo."option_key",
          slop."points"
        FROM "leadscore_option_points" slop
        INNER JOIN "leadscore" sl
          ON sl."id" = slop."leadscore_id"
        INNER JOIN "question" sq
          ON sq."id" = slop."question_id"
        INNER JOIN "question_option" sqo
          ON sqo."id" = slop."option_id"
        WHERE sl."form_version_id" = '${this.sourceFormVersionId}'::uuid
          AND sq."form_id" = '${this.sourceFormId}'::uuid
      ),
      mapped_target AS (
        SELECT
          tl."id" AS "target_leadscore_id",
          tq."id" AS "target_question_id",
          tqo."id" AS "target_option_id",
          sp."points"
        FROM source_points sp
        INNER JOIN "leadscore" tl
          ON tl."form_version_id" = '${this.targetFormVersionId}'::uuid
         AND LOWER(tl."name") = LOWER(sp."leadscore_name")
        INNER JOIN "question" tq
          ON tq."form_id" = '${this.targetFormId}'::uuid
         AND tq."question_key" = sp."question_key"
        INNER JOIN "question_option" tqo
          ON tqo."question_id" = tq."id"
         AND tqo."option_key" = sp."option_key"
      )
      INSERT INTO "leadscore_option_points" ("leadscore_id", "question_id", "option_id", "points")
      SELECT
        mt."target_leadscore_id",
        mt."target_question_id",
        mt."target_option_id",
        mt."points"
      FROM mapped_target mt
      WHERE NOT EXISTS (
        SELECT 1
        FROM "leadscore_option_points" tlop
        WHERE tlop."leadscore_id" = mt."target_leadscore_id"
          AND tlop."question_id" = mt."target_question_id"
          AND tlop."option_id" = mt."target_option_id"
      )
    `);

    await queryRunner.query(`
      WITH source_points AS (
        SELECT
          sl."name" AS "leadscore_name",
          sq."question_key",
          sqo."option_key",
          slop."points"
        FROM "leadscore_option_points" slop
        INNER JOIN "leadscore" sl
          ON sl."id" = slop."leadscore_id"
        INNER JOIN "question" sq
          ON sq."id" = slop."question_id"
        INNER JOIN "question_option" sqo
          ON sqo."id" = slop."option_id"
        WHERE sl."form_version_id" = '${this.sourceFormVersionId}'::uuid
          AND sq."form_id" = '${this.sourceFormId}'::uuid
      ),
      mapped_target AS (
        SELECT
          tl."id" AS "target_leadscore_id",
          tq."id" AS "target_question_id",
          tqo."id" AS "target_option_id",
          sp."points"
        FROM source_points sp
        INNER JOIN "leadscore" tl
          ON tl."form_version_id" = '${this.targetFormVersionId}'::uuid
         AND LOWER(tl."name") = LOWER(sp."leadscore_name")
        INNER JOIN "question" tq
          ON tq."form_id" = '${this.targetFormId}'::uuid
         AND tq."question_key" = sp."question_key"
        INNER JOIN "question_option" tqo
          ON tqo."question_id" = tq."id"
         AND tqo."option_key" = sp."option_key"
      )
      UPDATE "leadscore_option_points" tlop
      SET "points" = mt."points"
      FROM mapped_target mt
      WHERE tlop."leadscore_id" = mt."target_leadscore_id"
        AND tlop."question_id" = mt."target_question_id"
        AND tlop."option_id" = mt."target_option_id"
    `);

    await queryRunner.query(`
      WITH source_ranges AS (
        SELECT
          sl."name" AS "leadscore_name",
          sq."question_key",
          slrp."min_value",
          slrp."max_value",
          slrp."points"
        FROM "leadscore_range_points" slrp
        INNER JOIN "leadscore" sl
          ON sl."id" = slrp."leadscore_id"
        INNER JOIN "question" sq
          ON sq."id" = slrp."question_id"
        WHERE sl."form_version_id" = '${this.sourceFormVersionId}'::uuid
          AND sq."form_id" = '${this.sourceFormId}'::uuid
      ),
      mapped_target AS (
        SELECT
          tl."id" AS "target_leadscore_id",
          tq."id" AS "target_question_id",
          sr."min_value",
          sr."max_value",
          sr."points"
        FROM source_ranges sr
        INNER JOIN "leadscore" tl
          ON tl."form_version_id" = '${this.targetFormVersionId}'::uuid
         AND LOWER(tl."name") = LOWER(sr."leadscore_name")
        INNER JOIN "question" tq
          ON tq."form_id" = '${this.targetFormId}'::uuid
         AND tq."question_key" = sr."question_key"
      )
      INSERT INTO "leadscore_range_points" ("leadscore_id", "question_id", "min_value", "max_value", "points")
      SELECT
        mt."target_leadscore_id",
        mt."target_question_id",
        mt."min_value",
        mt."max_value",
        mt."points"
      FROM mapped_target mt
      WHERE NOT EXISTS (
        SELECT 1
        FROM "leadscore_range_points" tlrp
        WHERE tlrp."leadscore_id" = mt."target_leadscore_id"
          AND tlrp."question_id" = mt."target_question_id"
          AND tlrp."min_value" IS NOT DISTINCT FROM mt."min_value"
          AND tlrp."max_value" IS NOT DISTINCT FROM mt."max_value"
      )
    `);

    await queryRunner.query(`
      WITH source_ranges AS (
        SELECT
          sl."name" AS "leadscore_name",
          sq."question_key",
          slrp."min_value",
          slrp."max_value",
          slrp."points"
        FROM "leadscore_range_points" slrp
        INNER JOIN "leadscore" sl
          ON sl."id" = slrp."leadscore_id"
        INNER JOIN "question" sq
          ON sq."id" = slrp."question_id"
        WHERE sl."form_version_id" = '${this.sourceFormVersionId}'::uuid
          AND sq."form_id" = '${this.sourceFormId}'::uuid
      ),
      mapped_target AS (
        SELECT
          tl."id" AS "target_leadscore_id",
          tq."id" AS "target_question_id",
          sr."min_value",
          sr."max_value",
          sr."points"
        FROM source_ranges sr
        INNER JOIN "leadscore" tl
          ON tl."form_version_id" = '${this.targetFormVersionId}'::uuid
         AND LOWER(tl."name") = LOWER(sr."leadscore_name")
        INNER JOIN "question" tq
          ON tq."form_id" = '${this.targetFormId}'::uuid
         AND tq."question_key" = sr."question_key"
      )
      UPDATE "leadscore_range_points" tlrp
      SET "points" = mt."points"
      FROM mapped_target mt
      WHERE tlrp."leadscore_id" = mt."target_leadscore_id"
        AND tlrp."question_id" = mt."target_question_id"
        AND tlrp."min_value" IS NOT DISTINCT FROM mt."min_value"
        AND tlrp."max_value" IS NOT DISTINCT FROM mt."max_value"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH source_points AS (
        SELECT
          sl."name" AS "leadscore_name",
          sq."question_key",
          sqo."option_key",
          slop."points"
        FROM "leadscore_option_points" slop
        INNER JOIN "leadscore" sl
          ON sl."id" = slop."leadscore_id"
        INNER JOIN "question" sq
          ON sq."id" = slop."question_id"
        INNER JOIN "question_option" sqo
          ON sqo."id" = slop."option_id"
        WHERE sl."form_version_id" = '${this.sourceFormVersionId}'::uuid
          AND sq."form_id" = '${this.sourceFormId}'::uuid
      ),
      mapped_target AS (
        SELECT
          tl."id" AS "target_leadscore_id",
          tq."id" AS "target_question_id",
          tqo."id" AS "target_option_id",
          sp."points"
        FROM source_points sp
        INNER JOIN "leadscore" tl
          ON tl."form_version_id" = '${this.targetFormVersionId}'::uuid
         AND LOWER(tl."name") = LOWER(sp."leadscore_name")
        INNER JOIN "question" tq
          ON tq."form_id" = '${this.targetFormId}'::uuid
         AND tq."question_key" = sp."question_key"
        INNER JOIN "question_option" tqo
          ON tqo."question_id" = tq."id"
         AND tqo."option_key" = sp."option_key"
      )
      DELETE FROM "leadscore_option_points" tlop
      USING mapped_target mt
      WHERE tlop."leadscore_id" = mt."target_leadscore_id"
        AND tlop."question_id" = mt."target_question_id"
        AND tlop."option_id" = mt."target_option_id"
        AND tlop."points" IS NOT DISTINCT FROM mt."points"
    `);

    await queryRunner.query(`
      WITH source_ranges AS (
        SELECT
          sl."name" AS "leadscore_name",
          sq."question_key",
          slrp."min_value",
          slrp."max_value",
          slrp."points"
        FROM "leadscore_range_points" slrp
        INNER JOIN "leadscore" sl
          ON sl."id" = slrp."leadscore_id"
        INNER JOIN "question" sq
          ON sq."id" = slrp."question_id"
        WHERE sl."form_version_id" = '${this.sourceFormVersionId}'::uuid
          AND sq."form_id" = '${this.sourceFormId}'::uuid
      ),
      mapped_target AS (
        SELECT
          tl."id" AS "target_leadscore_id",
          tq."id" AS "target_question_id",
          sr."min_value",
          sr."max_value",
          sr."points"
        FROM source_ranges sr
        INNER JOIN "leadscore" tl
          ON tl."form_version_id" = '${this.targetFormVersionId}'::uuid
         AND LOWER(tl."name") = LOWER(sr."leadscore_name")
        INNER JOIN "question" tq
          ON tq."form_id" = '${this.targetFormId}'::uuid
         AND tq."question_key" = sr."question_key"
      )
      DELETE FROM "leadscore_range_points" tlrp
      USING mapped_target mt
      WHERE tlrp."leadscore_id" = mt."target_leadscore_id"
        AND tlrp."question_id" = mt."target_question_id"
        AND tlrp."min_value" IS NOT DISTINCT FROM mt."min_value"
        AND tlrp."max_value" IS NOT DISTINCT FROM mt."max_value"
        AND tlrp."points" IS NOT DISTINCT FROM mt."points"
    `);

    await queryRunner.query(`
      WITH source_rules AS (
        SELECT
          sl."name" AS "leadscore_name",
          ltr."tier_id",
          ltr."min_score",
          ltr."max_score"
        FROM "leadscore_tier_rule" ltr
        INNER JOIN "leadscore" sl
          ON sl."id" = ltr."leadscore_id"
        WHERE sl."form_version_id" = '${this.sourceFormVersionId}'::uuid
      ),
      mapped_target AS (
        SELECT
          tl."id" AS "target_leadscore_id",
          sr."tier_id",
          sr."min_score",
          sr."max_score"
        FROM source_rules sr
        INNER JOIN "leadscore" tl
          ON tl."form_version_id" = '${this.targetFormVersionId}'::uuid
         AND LOWER(tl."name") = LOWER(sr."leadscore_name")
      )
      DELETE FROM "leadscore_tier_rule" tltr
      USING mapped_target mt
      WHERE tltr."leadscore_id" = mt."target_leadscore_id"
        AND tltr."tier_id" = mt."tier_id"
        AND tltr."min_score" IS NOT DISTINCT FROM mt."min_score"
        AND tltr."max_score" IS NOT DISTINCT FROM mt."max_score"
    `);

    await queryRunner.query(`
      WITH source_leadscores AS (
        SELECT sl."name"
        FROM "leadscore" sl
        WHERE sl."form_version_id" = '${this.sourceFormVersionId}'::uuid
      )
      DELETE FROM "leadscore" tl
      WHERE tl."form_version_id" = '${this.targetFormVersionId}'::uuid
        AND EXISTS (
          SELECT 1
          FROM source_leadscores sl
          WHERE LOWER(sl."name") = LOWER(tl."name")
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "leadscore_option_points" lop
          WHERE lop."leadscore_id" = tl."id"
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "leadscore_range_points" lrp
          WHERE lrp."leadscore_id" = tl."id"
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "leadscore_tier_rule" ltr
          WHERE ltr."leadscore_id" = tl."id"
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "leadscore_result" lr
          WHERE lr."leadscore_id" = tl."id"
        )
    `);

    await queryRunner.query(`
      DELETE FROM "form_version_question" tfvq
      USING "question" tq
      WHERE tfvq."question_id" = tq."id"
        AND tfvq."form_version_id" = '${this.targetFormVersionId}'::uuid
        AND tq."form_id" = '${this.targetFormId}'::uuid
        AND EXISTS (
          SELECT 1
          FROM "question" sq
          WHERE sq."form_id" = '${this.sourceFormId}'::uuid
            AND sq."question_key" = tq."question_key"
        )
    `);

    await queryRunner.query(`
      DELETE FROM "question_option" tqo
      USING "question" tq
      WHERE tqo."question_id" = tq."id"
        AND tq."form_id" = '${this.targetFormId}'::uuid
        AND EXISTS (
          SELECT 1
          FROM "question" sq
          INNER JOIN "question_option" sqo
            ON sqo."question_id" = sq."id"
          WHERE sq."form_id" = '${this.sourceFormId}'::uuid
            AND sq."question_key" = tq."question_key"
            AND sqo."option_key" = tqo."option_key"
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "form_answer" fa
          WHERE fa."option_id" = tqo."id"
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "leadscore_option_points" lop
          WHERE lop."option_id" = tqo."id"
        )
    `);

    await queryRunner.query(`
      DELETE FROM "question" tq
      WHERE tq."form_id" = '${this.targetFormId}'::uuid
        AND EXISTS (
          SELECT 1
          FROM "question" sq
          WHERE sq."form_id" = '${this.sourceFormId}'::uuid
            AND sq."question_key" = tq."question_key"
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "question_option" tqo
          WHERE tqo."question_id" = tq."id"
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "form_answer" fa
          WHERE fa."question_id" = tq."id"
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "form_version_question" tfvq
          WHERE tfvq."question_id" = tq."id"
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "leadscore_option_points" tlop
          WHERE tlop."question_id" = tq."id"
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "leadscore_range_points" tlrp
          WHERE tlrp."question_id" = tq."id"
        )
    `);
  }
}
