import { MigrationInterface, QueryRunner } from 'typeorm';

export class CopyLeadscorePointsFromOtimistasToExAliados1770000000028
  implements MigrationInterface
{
  name = 'CopyLeadscorePointsFromOtimistasToExAliados1770000000028';

  private readonly sourceFormId = '7405904f-64b9-4b2e-a067-a5fa246e1d55';
  private readonly sourceLeadscoreId = '7c9e8ea7-90c7-4d2c-b723-78a5bc4276c1';
  private readonly targetFormId = 'd588a7fc-3110-4fe5-87f2-fc5fbf74b321';
  private readonly targetLeadscoreId = '24246136-44fb-42e8-ba0b-c68d37fe70bc';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH mapped AS (
        SELECT
          tq.id AS target_question_id,
          tqo.id AS target_option_id,
          slop.points AS points
        FROM "leadscore_option_points" slop
        INNER JOIN "question" sq
          ON sq.id = slop."question_id"
        INNER JOIN "question_option" sqo
          ON sqo.id = slop."option_id"
        INNER JOIN "question" tq
          ON tq."form_id" = '${this.targetFormId}'::uuid
         AND tq."question_key" = sq."question_key"
        INNER JOIN "question_option" tqo
          ON tqo."question_id" = tq.id
         AND tqo."option_key" = sqo."option_key"
        WHERE slop."leadscore_id" = '${this.sourceLeadscoreId}'::uuid
          AND sq."form_id" = '${this.sourceFormId}'::uuid
      )
      INSERT INTO "leadscore_option_points" ("leadscore_id", "question_id", "option_id", "points")
      SELECT
        '${this.targetLeadscoreId}'::uuid,
        m.target_question_id,
        m.target_option_id,
        m.points
      FROM mapped m
      WHERE NOT EXISTS (
        SELECT 1
        FROM "leadscore_option_points" lop
        WHERE lop."leadscore_id" = '${this.targetLeadscoreId}'::uuid
          AND lop."question_id" = m.target_question_id
          AND lop."option_id" = m.target_option_id
      )
    `);

    await queryRunner.query(`
      WITH mapped AS (
        SELECT
          tq.id AS target_question_id,
          tqo.id AS target_option_id,
          slop.points AS points
        FROM "leadscore_option_points" slop
        INNER JOIN "question" sq
          ON sq.id = slop."question_id"
        INNER JOIN "question_option" sqo
          ON sqo.id = slop."option_id"
        INNER JOIN "question" tq
          ON tq."form_id" = '${this.targetFormId}'::uuid
         AND tq."question_key" = sq."question_key"
        INNER JOIN "question_option" tqo
          ON tqo."question_id" = tq.id
         AND tqo."option_key" = sqo."option_key"
        WHERE slop."leadscore_id" = '${this.sourceLeadscoreId}'::uuid
          AND sq."form_id" = '${this.sourceFormId}'::uuid
      )
      UPDATE "leadscore_option_points" lop
      SET "points" = m.points
      FROM mapped m
      WHERE lop."leadscore_id" = '${this.targetLeadscoreId}'::uuid
        AND lop."question_id" = m.target_question_id
        AND lop."option_id" = m.target_option_id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH mapped AS (
        SELECT
          tq.id AS target_question_id,
          tqo.id AS target_option_id,
          slop.points AS points
        FROM "leadscore_option_points" slop
        INNER JOIN "question" sq
          ON sq.id = slop."question_id"
        INNER JOIN "question_option" sqo
          ON sqo.id = slop."option_id"
        INNER JOIN "question" tq
          ON tq."form_id" = '${this.targetFormId}'::uuid
         AND tq."question_key" = sq."question_key"
        INNER JOIN "question_option" tqo
          ON tqo."question_id" = tq.id
         AND tqo."option_key" = sqo."option_key"
        WHERE slop."leadscore_id" = '${this.sourceLeadscoreId}'::uuid
          AND sq."form_id" = '${this.sourceFormId}'::uuid
      )
      DELETE FROM "leadscore_option_points" lop
      USING mapped m
      WHERE lop."leadscore_id" = '${this.targetLeadscoreId}'::uuid
        AND lop."question_id" = m.target_question_id
        AND lop."option_id" = m.target_option_id
        AND lop."points" = m.points
    `);
  }
}

