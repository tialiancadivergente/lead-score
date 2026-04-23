import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedQuestionsResgateExAliados1770000000022
  implements MigrationInterface
{
  name = 'SeedQuestionsResgateExAliados1770000000022';

  private readonly formId = 'd588a7fc-3110-4fe5-87f2-fc5fbf74b321';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "question" ("form_id", "question_key", "question_text", "input_type")
      SELECT
        '${this.formId}'::uuid,
        d.question_key,
        d.question_text,
        d.input_type
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
