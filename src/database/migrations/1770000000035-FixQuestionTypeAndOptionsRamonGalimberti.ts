import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixQuestionTypeAndOptionsRamonGalimberti1770000000035 implements MigrationInterface {
  name = 'FixQuestionTypeAndOptionsRamonGalimberti1770000000035';

  private readonly formId = '9ebd852f-c59a-4217-8530-f7831e44d02d';
  private readonly formVersionId = '2228a3ba-b79e-41b0-90a0-47cac5816209';
  private readonly questionText = 'Você conhece o Ramon Galimberti?';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM "question" q
          INNER JOIN "form_version_question" fvq
            ON fvq."question_id" = q."id"
          WHERE q."form_id" = '${this.formId}'::uuid
            AND fvq."form_version_id" = '${this.formVersionId}'::uuid
            AND LOWER(q."question_text") = LOWER('${this.questionText}')
        ) THEN
          RAISE EXCEPTION 'Question not found in form/version context: %', '${this.questionText}';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      UPDATE "question" q
      SET "input_type" = 'single'
      FROM "form_version_question" fvq
      WHERE fvq."question_id" = q."id"
        AND q."form_id" = '${this.formId}'::uuid
        AND fvq."form_version_id" = '${this.formVersionId}'::uuid
        AND LOWER(q."question_text") = LOWER('${this.questionText}')
    `);

    await queryRunner.query(`
      WITH target_questions AS (
        SELECT q."id"
        FROM "question" q
        INNER JOIN "form_version_question" fvq
          ON fvq."question_id" = q."id"
        WHERE q."form_id" = '${this.formId}'::uuid
          AND fvq."form_version_id" = '${this.formVersionId}'::uuid
          AND LOWER(q."question_text") = LOWER('${this.questionText}')
      ),
      data AS (
        SELECT *
        FROM (
          VALUES
            ('sim', 'Sim', 1),
            ('nao', 'Não', 2)
        ) AS t(option_key, option_text, display_order)
      )
      INSERT INTO "question_option" ("question_id", "option_key", "option_text", "display_order")
      SELECT
        tq."id",
        d.option_key,
        d.option_text,
        d.display_order
      FROM target_questions tq
      CROSS JOIN data d
      WHERE NOT EXISTS (
        SELECT 1
        FROM "question_option" qo
        WHERE qo."question_id" = tq."id"
          AND qo."option_key" = d.option_key
      )
    `);

    await queryRunner.query(`
      WITH target_questions AS (
        SELECT q."id"
        FROM "question" q
        INNER JOIN "form_version_question" fvq
          ON fvq."question_id" = q."id"
        WHERE q."form_id" = '${this.formId}'::uuid
          AND fvq."form_version_id" = '${this.formVersionId}'::uuid
          AND LOWER(q."question_text") = LOWER('${this.questionText}')
      ),
      data AS (
        SELECT *
        FROM (
          VALUES
            ('sim', 'Sim', 1),
            ('nao', 'Não', 2)
        ) AS t(option_key, option_text, display_order)
      )
      UPDATE "question_option" qo
      SET
        "option_text" = d.option_text,
        "display_order" = d.display_order
      FROM target_questions tq
      CROSS JOIN data d
      WHERE qo."question_id" = tq."id"
        AND qo."option_key" = d.option_key
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "question" q
      SET "input_type" = 'text'
      FROM "form_version_question" fvq
      WHERE fvq."question_id" = q."id"
        AND q."form_id" = '${this.formId}'::uuid
        AND fvq."form_version_id" = '${this.formVersionId}'::uuid
        AND LOWER(q."question_text") = LOWER('${this.questionText}')
    `);

    await queryRunner.query(`
      DELETE FROM "question_option" qo
      USING "question" q, "form_version_question" fvq
      WHERE qo."question_id" = q."id"
        AND fvq."question_id" = q."id"
        AND q."form_id" = '${this.formId}'::uuid
        AND fvq."form_version_id" = '${this.formVersionId}'::uuid
        AND LOWER(q."question_text") = LOWER('${this.questionText}')
        AND qo."option_key" IN ('sim', 'nao')
        AND NOT EXISTS (
          SELECT 1
          FROM "form_answer" fa
          WHERE fa."option_id" = qo."id"
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "leadscore_option_points" lop
          WHERE lop."option_id" = qo."id"
        )
    `);
  }
}
