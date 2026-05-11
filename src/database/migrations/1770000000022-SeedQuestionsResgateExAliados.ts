import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedQuestionsResgateExAliados1770000000022
  implements MigrationInterface
{
  name = 'SeedQuestionsResgateExAliados1770000000022';

  private readonly formId = 'd588a7fc-3110-4fe5-87f2-fc5fbf74b321';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "question" ("id", "form_id", "question_key", "question_text", "input_type")
      SELECT
        d.id,
        '${this.formId}'::uuid,
        d.question_key,
        d.question_text,
        d.input_type
      FROM (
        VALUES
          ('06fd9510-d974-473b-a60e-6ff31e2ab984'::uuid, 'q1',  'Em qual faixa etária você se encaixa?', 'single'),
          ('5134517a-78df-4a79-b979-a54862990aed'::uuid, 'q2',  'Qual é o seu nível de escolaridade?', 'single'),
          ('a0a80d9d-a731-44ce-b602-e38e70e18651'::uuid, 'q3',  'Qual seu sexo?', 'single'),
          ('dbb89d15-6835-4634-b40a-0c06ec1af7c8'::uuid, 'q4',  'Qual seu estado civil?', 'single'),
          ('9eaef8a4-5d7d-4ab0-ae35-6d57aa43eb9e'::uuid, 'q5',  'Você tem filhos?', 'single'),
          ('0520d6de-ec36-41ad-a886-c9aedd5588d9'::uuid, 'q6',  'Qual das opções representa a sua renda mensal hoje?', 'single'),
          ('a3609ebd-19dc-4ce7-aa89-a3d7af1dce0b'::uuid, 'q7',  'Você trabalha como (marque o trabalho que te gera mais renda):', 'single'),
          ('735c61e0-7f70-4a74-aebc-484f6e4739f7'::uuid, 'q8',  'Com que frequência você se sente sozinho(a)/travado(a) e com baixos resultados?', 'single'),
          ('fe64bb3c-7fb8-4dc2-82f9-0044ad0beb05'::uuid, 'q9',  'Você já buscou algum tipo de ajuda ou suporte (terapia, coaching, grupos de apoio) para lidar com seus desafios emocionais?', 'single'),
          ('88aaee19-203c-4f8a-88d1-9a2f47bd2f16'::uuid, 'q10', 'Se sim, o método utilizado foi eficaz?', 'single'),
          ('7185e3ef-3de8-4642-8cb8-33b4f2e339f7'::uuid, 'q11', 'O que você busca no Resgate dos otimistas para o que vc busca no Próximo nível?', 'text')
      ) AS d(id, question_key, question_text, input_type)
      WHERE NOT EXISTS (
        SELECT 1
        FROM "question" q
        WHERE q."form_id" = '${this.formId}'::uuid
          AND q."question_key" = d.question_key
      )
    `);

    await queryRunner.query(`
      UPDATE "question" q
      SET
        "question_text" = d.question_text,
        "input_type" = d.input_type
      FROM (
        VALUES
          ('q1',  'Em qual faixa etária você se encaixa?', 'single'),
          ('q2',  'Qual é o seu nível de escolaridade?', 'single'),
          ('q3',  'Qual seu sexo?', 'single'),
          ('q4',  'Qual seu estado civil?', 'single'),
          ('q5',  'Você tem filhos?', 'single'),
          ('q6',  'Qual das opções representa a sua renda mensal hoje?', 'single'),
          ('q7',  'Você trabalha como (marque o trabalho que te gera mais renda):', 'single'),
          ('q8',  'Com que frequência você se sente sozinho(a)/travado(a) e com baixos resultados?', 'single'),
          ('q9',  'Você já buscou algum tipo de ajuda ou suporte (terapia, coaching, grupos de apoio) para lidar com seus desafios emocionais?', 'single'),
          ('q10', 'Se sim, o método utilizado foi eficaz?', 'single'),
          ('q11', 'O que você busca no Resgate dos otimistas para o que vc busca no Próximo nível?', 'text')
      ) AS d(question_key, question_text, input_type)
      WHERE q."form_id" = '${this.formId}'::uuid
        AND q."question_key" = d.question_key
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "question" q
      WHERE q."form_id" = '${this.formId}'::uuid
        AND q."question_key" IN ('q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11')
    `);
  }
}
