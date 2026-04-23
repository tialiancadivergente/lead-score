import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuestionRamonGalimbertiToLdiForm1770000000034
  implements MigrationInterface
{
  name = 'AddQuestionRamonGalimbertiToLdiForm1770000000034';

  private readonly formId = '9ebd852f-c59a-4217-8530-f7831e44d02d';
  private readonly formVersionId = '2228a3ba-b79e-41b0-90a0-47cac5816209';
  private readonly questionKey = 'q14';
  private readonly questionText = 'Você conhece o Ramon Galimberti?';
  private readonly inputType = 'text';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM "form" f
          WHERE f."id" = '${this.formId}'::uuid
        ) THEN
          RAISE EXCEPTION 'Form not found: %', '${this.formId}';
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM "form_version" fv
          WHERE fv."id" = '${this.formVersionId}'::uuid
            AND fv."form_id" = '${this.formId}'::uuid
        ) THEN
          RAISE EXCEPTION 'Form version not found for form: %', '${this.formVersionId}';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      INSERT INTO "question" ("form_id", "question_key", "question_text", "input_type")
      SELECT
        '${this.formId}'::uuid,
        '${this.questionKey}',
        '${this.questionText}',
        '${this.inputType}'
      WHERE NOT EXISTS (
        SELECT 1
        FROM "question" q
        WHERE q."form_id" = '${this.formId}'::uuid
          AND q."question_key" = '${this.questionKey}'
      )
    `);

    await queryRunner.query(`
      UPDATE "question"
      SET
        "question_text" = '${this.questionText}',
        "input_type" = '${this.inputType}'
      WHERE "form_id" = '${this.formId}'::uuid
        AND "question_key" = '${this.questionKey}'
    `);

    await queryRunner.query(`
      WITH target_question AS (
        SELECT q."id"
        FROM "question" q
        WHERE q."form_id" = '${this.formId}'::uuid
          AND q."question_key" = '${this.questionKey}'
      ),
      next_order AS (
        SELECT COALESCE(MAX(fvq."display_order"), 0) + 1 AS "display_order"
        FROM "form_version_question" fvq
        WHERE fvq."form_version_id" = '${this.formVersionId}'::uuid
      )
      INSERT INTO "form_version_question" ("form_version_id", "question_id", "display_order", "required")
      SELECT
        '${this.formVersionId}'::uuid,
        tq."id",
        no."display_order",
        false
      FROM target_question tq
      CROSS JOIN next_order no
      WHERE NOT EXISTS (
        SELECT 1
        FROM "form_version_question" fvq
        WHERE fvq."form_version_id" = '${this.formVersionId}'::uuid
          AND fvq."question_id" = tq."id"
      )
    `);

    await queryRunner.query(`
      UPDATE "form_version_question" fvq
      SET "required" = false
      FROM "question" q
      WHERE fvq."form_version_id" = '${this.formVersionId}'::uuid
        AND fvq."question_id" = q."id"
        AND q."form_id" = '${this.formId}'::uuid
        AND q."question_key" = '${this.questionKey}'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "form_version_question" fvq
      USING "question" q
      WHERE fvq."question_id" = q."id"
        AND fvq."form_version_id" = '${this.formVersionId}'::uuid
        AND q."form_id" = '${this.formId}'::uuid
        AND q."question_key" = '${this.questionKey}'
    `);

    await queryRunner.query(`
      DELETE FROM "question" q
      WHERE q."form_id" = '${this.formId}'::uuid
        AND q."question_key" = '${this.questionKey}'
        AND NOT EXISTS (
          SELECT 1
          FROM "question_option" qo
          WHERE qo."question_id" = q."id"
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "form_answer" fa
          WHERE fa."question_id" = q."id"
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "form_version_question" fvq
          WHERE fvq."question_id" = q."id"
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "leadscore_option_points" lop
          WHERE lop."question_id" = q."id"
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "leadscore_range_points" lrp
          WHERE lrp."question_id" = q."id"
        )
    `);
  }
}
