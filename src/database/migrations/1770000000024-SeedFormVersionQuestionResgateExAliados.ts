import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedFormVersionQuestionResgateExAliados1770000000024
  implements MigrationInterface
{
  name = 'SeedFormVersionQuestionResgateExAliados1770000000024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "form_version_question" ("form_version_id", "question_id", "display_order", "required")
      SELECT
        d.form_version_id,
        d.question_id,
        d.display_order,
        d.required
      FROM (
        VALUES
          (1,  true,  'a9e5538c-ee07-41e4-95a0-862e89adf186'::uuid, '06fd9510-d974-473b-a60e-6ff31e2ab984'::uuid),
          (2,  true,  'a9e5538c-ee07-41e4-95a0-862e89adf186'::uuid, '5134517a-78df-4a79-b979-a54862990aed'::uuid),
          (3,  true,  'a9e5538c-ee07-41e4-95a0-862e89adf186'::uuid, 'a0a80d9d-a731-44ce-b602-e38e70e18651'::uuid),
          (4,  true,  'a9e5538c-ee07-41e4-95a0-862e89adf186'::uuid, 'dbb89d15-6835-4634-b40a-0c06ec1af7c8'::uuid),
          (5,  true,  'a9e5538c-ee07-41e4-95a0-862e89adf186'::uuid, '9eaef8a4-5d7d-4ab0-ae35-6d57aa43eb9e'::uuid),
          (6,  true,  'a9e5538c-ee07-41e4-95a0-862e89adf186'::uuid, '0520d6de-ec36-41ad-a886-c9aedd5588d9'::uuid),
          (7,  true,  'a9e5538c-ee07-41e4-95a0-862e89adf186'::uuid, 'a3609ebd-19dc-4ce7-aa89-a3d7af1dce0b'::uuid),
          (8,  true,  'a9e5538c-ee07-41e4-95a0-862e89adf186'::uuid, '735c61e0-7f70-4a74-aebc-484f6e4739f7'::uuid),
          (9,  true,  'a9e5538c-ee07-41e4-95a0-862e89adf186'::uuid, 'fe64bb3c-7fb8-4dc2-82f9-0044ad0beb05'::uuid),
          (10, true,  'a9e5538c-ee07-41e4-95a0-862e89adf186'::uuid, '88aaee19-203c-4f8a-88d1-9a2f47bd2f16'::uuid),
          (11, false, 'a9e5538c-ee07-41e4-95a0-862e89adf186'::uuid, '7185e3ef-3de8-4642-8cb8-33b4f2e339f7'::uuid)
      ) AS d(display_order, required, form_version_id, question_id)
      WHERE NOT EXISTS (
        SELECT 1
        FROM "form_version_question" fvq
        WHERE fvq."form_version_id" = d.form_version_id
          AND fvq."question_id" = d.question_id
      )
    `);

    await queryRunner.query(`
      UPDATE "form_version_question" fvq
      SET
        "display_order" = d.display_order,
        "required" = d.required
      FROM (
        VALUES
          (1,  true,  'a9e5538c-ee07-41e4-95a0-862e89adf186'::uuid, '06fd9510-d974-473b-a60e-6ff31e2ab984'::uuid),
          (2,  true,  'a9e5538c-ee07-41e4-95a0-862e89adf186'::uuid, '5134517a-78df-4a79-b979-a54862990aed'::uuid),
          (3,  true,  'a9e5538c-ee07-41e4-95a0-862e89adf186'::uuid, 'a0a80d9d-a731-44ce-b602-e38e70e18651'::uuid),
          (4,  true,  'a9e5538c-ee07-41e4-95a0-862e89adf186'::uuid, 'dbb89d15-6835-4634-b40a-0c06ec1af7c8'::uuid),
          (5,  true,  'a9e5538c-ee07-41e4-95a0-862e89adf186'::uuid, '9eaef8a4-5d7d-4ab0-ae35-6d57aa43eb9e'::uuid),
          (6,  true,  'a9e5538c-ee07-41e4-95a0-862e89adf186'::uuid, '0520d6de-ec36-41ad-a886-c9aedd5588d9'::uuid),
          (7,  true,  'a9e5538c-ee07-41e4-95a0-862e89adf186'::uuid, 'a3609ebd-19dc-4ce7-aa89-a3d7af1dce0b'::uuid),
          (8,  true,  'a9e5538c-ee07-41e4-95a0-862e89adf186'::uuid, '735c61e0-7f70-4a74-aebc-484f6e4739f7'::uuid),
          (9,  true,  'a9e5538c-ee07-41e4-95a0-862e89adf186'::uuid, 'fe64bb3c-7fb8-4dc2-82f9-0044ad0beb05'::uuid),
          (10, true,  'a9e5538c-ee07-41e4-95a0-862e89adf186'::uuid, '88aaee19-203c-4f8a-88d1-9a2f47bd2f16'::uuid),
          (11, false, 'a9e5538c-ee07-41e4-95a0-862e89adf186'::uuid, '7185e3ef-3de8-4642-8cb8-33b4f2e339f7'::uuid)
      ) AS d(display_order, required, form_version_id, question_id)
      WHERE fvq."form_version_id" = d.form_version_id
        AND fvq."question_id" = d.question_id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "form_version_question" fvq
      WHERE fvq."form_version_id" = 'a9e5538c-ee07-41e4-95a0-862e89adf186'::uuid
        AND fvq."question_id" IN (
          '06fd9510-d974-473b-a60e-6ff31e2ab984'::uuid,
          '5134517a-78df-4a79-b979-a54862990aed'::uuid,
          'a0a80d9d-a731-44ce-b602-e38e70e18651'::uuid,
          'dbb89d15-6835-4634-b40a-0c06ec1af7c8'::uuid,
          '9eaef8a4-5d7d-4ab0-ae35-6d57aa43eb9e'::uuid,
          '0520d6de-ec36-41ad-a886-c9aedd5588d9'::uuid,
          'a3609ebd-19dc-4ce7-aa89-a3d7af1dce0b'::uuid,
          '735c61e0-7f70-4a74-aebc-484f6e4739f7'::uuid,
          'fe64bb3c-7fb8-4dc2-82f9-0044ad0beb05'::uuid,
          '88aaee19-203c-4f8a-88d1-9a2f47bd2f16'::uuid,
          '7185e3ef-3de8-4642-8cb8-33b4f2e339f7'::uuid
        )
    `);
  }
}

