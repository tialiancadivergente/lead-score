import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedOroQuizQuestionsAndPoints1770000000013
  implements MigrationInterface
{
  name = 'SeedOroQuizQuestionsAndPoints1770000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH fv AS (
        SELECT
          fv.id AS form_version_id,
          fv.form_id AS form_id
        FROM "form_version" fv
        WHERE fv.id = '2f76bc57-57a2-41fd-9c2c-18a726dd4fe0'::uuid
      ),
      data AS (
        SELECT * FROM (
          VALUES
            ('q1',  'Em qual faixa etária você se encaixa?', 'single', 1,  true),
            ('q2',  'Qual é o seu nível de escolaridade?', 'single', 2,  true),
            ('q3',  'Qual seu sexo?', 'single', 3,  true),
            ('q4',  'Qual seu estado civil?', 'single', 4,  true),
            ('q5',  'Você tem filhos?', 'single', 5,  true),
            ('q6',  'Qual das opções representa a sua renda mensal hoje?', 'single', 6,  true),
            ('q7',  'Você trabalha como (marque o trabalho que te gera mais renda):', 'single', 7,  true),
            ('q8',  'Com que frequência você se sente sozinho(a)/travado(a) e com baixos resultados?', 'single', 8,  true),
            ('q9',  'Você já buscou algum tipo de ajuda ou suporte (terapia, coaching, grupos de apoio) para lidar com seus desafios emocionais?', 'single', 9,  true),
            ('q10', 'Se sim, o método utilizado foi eficaz?', 'single', 10, true),
            ('q11', 'Você conhece o Elton Euler?', 'single', 11, true),
            ('q12', 'Você conhece a Aliança Divergente?', 'single', 12, true),
            ('q13', 'O que você mais espera mudar ou resolver participando d''O Resgate dos Otimistas?', 'text', 13, false)
        ) AS t(question_key, question_text, input_type, display_order, required)
      )
      INSERT INTO "question" ("form_id", "question_key", "question_text", "input_type")
      SELECT
        fv.form_id,
        d.question_key,
        d.question_text,
        d.input_type
      FROM fv
      CROSS JOIN data d
      WHERE NOT EXISTS (
        SELECT 1
        FROM "question" q
        WHERE q."form_id" = fv.form_id
          AND q."question_key" = d.question_key
      )
    `);

    await queryRunner.query(`
      WITH fv AS (
        SELECT
          fv.id AS form_version_id,
          fv.form_id AS form_id
        FROM "form_version" fv
        WHERE fv.id = '2f76bc57-57a2-41fd-9c2c-18a726dd4fe0'::uuid
      ),
      data AS (
        SELECT * FROM (
          VALUES
            ('q1',  'Em qual faixa etária você se encaixa?', 'single', 1,  true),
            ('q2',  'Qual é o seu nível de escolaridade?', 'single', 2,  true),
            ('q3',  'Qual seu sexo?', 'single', 3,  true),
            ('q4',  'Qual seu estado civil?', 'single', 4,  true),
            ('q5',  'Você tem filhos?', 'single', 5,  true),
            ('q6',  'Qual das opções representa a sua renda mensal hoje?', 'single', 6,  true),
            ('q7',  'Você trabalha como (marque o trabalho que te gera mais renda):', 'single', 7,  true),
            ('q8',  'Com que frequência você se sente sozinho(a)/travado(a) e com baixos resultados?', 'single', 8,  true),
            ('q9',  'Você já buscou algum tipo de ajuda ou suporte (terapia, coaching, grupos de apoio) para lidar com seus desafios emocionais?', 'single', 9,  true),
            ('q10', 'Se sim, o método utilizado foi eficaz?', 'single', 10, true),
            ('q11', 'Você conhece o Elton Euler?', 'single', 11, true),
            ('q12', 'Você conhece a Aliança Divergente?', 'single', 12, true),
            ('q13', 'O que você mais espera mudar ou resolver participando d''O Resgate dos Otimistas?', 'text', 13, false)
        ) AS t(question_key, question_text, input_type, display_order, required)
      )
      UPDATE "question" q
      SET
        "question_text" = d.question_text,
        "input_type" = d.input_type
      FROM fv, data d
      WHERE q."form_id" = fv.form_id
        AND q."question_key" = d.question_key
    `);

    await queryRunner.query(`
      WITH fv AS (
        SELECT
          fv.id AS form_version_id,
          fv.form_id AS form_id
        FROM "form_version" fv
        WHERE fv.id = '2f76bc57-57a2-41fd-9c2c-18a726dd4fe0'::uuid
      ),
      data AS (
        SELECT * FROM (
          VALUES
            ('q1',  1,  true),
            ('q2',  2,  true),
            ('q3',  3,  true),
            ('q4',  4,  true),
            ('q5',  5,  true),
            ('q6',  6,  true),
            ('q7',  7,  true),
            ('q8',  8,  true),
            ('q9',  9,  true),
            ('q10', 10, true),
            ('q11', 11, true),
            ('q12', 12, true),
            ('q13', 13, false)
        ) AS t(question_key, display_order, required)
      )
      INSERT INTO "form_version_question" ("form_version_id", "question_id", "display_order", "required")
      SELECT
        fv.form_version_id,
        q.id,
        d.display_order,
        d.required
      FROM fv
      INNER JOIN data d ON 1 = 1
      INNER JOIN "question" q
        ON q."form_id" = fv.form_id
       AND q."question_key" = d.question_key
      WHERE NOT EXISTS (
        SELECT 1
        FROM "form_version_question" fvq
        WHERE fvq."form_version_id" = fv.form_version_id
          AND fvq."question_id" = q.id
      )
    `);

    await queryRunner.query(`
      WITH fv AS (
        SELECT
          fv.id AS form_version_id,
          fv.form_id AS form_id
        FROM "form_version" fv
        WHERE fv.id = '2f76bc57-57a2-41fd-9c2c-18a726dd4fe0'::uuid
      ),
      data AS (
        SELECT * FROM (
          VALUES
            ('q1',  1,  true),
            ('q2',  2,  true),
            ('q3',  3,  true),
            ('q4',  4,  true),
            ('q5',  5,  true),
            ('q6',  6,  true),
            ('q7',  7,  true),
            ('q8',  8,  true),
            ('q9',  9,  true),
            ('q10', 10, true),
            ('q11', 11, true),
            ('q12', 12, true),
            ('q13', 13, false)
        ) AS t(question_key, display_order, required)
      )
      UPDATE "form_version_question" fvq
      SET
        "display_order" = d.display_order,
        "required" = d.required
      FROM fv
      INNER JOIN data d ON 1 = 1
      INNER JOIN "question" q
        ON q."form_id" = fv.form_id
       AND q."question_key" = d.question_key
      WHERE fvq."form_version_id" = fv.form_version_id
        AND fvq."question_id" = q.id
    `);

    await queryRunner.query(`
      WITH fv AS (
        SELECT fv.form_id AS form_id
        FROM "form_version" fv
        WHERE fv.id = '2f76bc57-57a2-41fd-9c2c-18a726dd4fe0'::uuid
      ),
      data AS (
        SELECT * FROM (
          VALUES
            ('q1',  '18-24',               '18-24',                                          1),
            ('q1',  '25-35',               '25-35',                                          2),
            ('q1',  '36-45',               '36-45',                                          3),
            ('q1',  '46-55',               '46-55',                                          4),
            ('q1',  '56+',                 '56 ou mais',                                     5),
            ('q2',  'fundamental1',        'Ensino Fundamental 1 (1º ao 5º ano)',            1),
            ('q2',  'fundamental2',        'Ensino Fundamental 2 (6º ao 9º ano)',            2),
            ('q2',  'medio',               'Ensino Médio (1º ao 3º)',                        3),
            ('q2',  'superior-incompleto', 'Ensino Superior Incompleto',                     4),
            ('q2',  'superior',            'Ensino Superior (Graduação/Faculdade)',          5),
            ('q2',  'pos',                 'Pós-Graduação',                                  6),
            ('q2',  'mestrado',            'Mestrado',                                       7),
            ('q2',  'doutorado',           'Doutorado',                                      8),
            ('q3',  'feminino',            'Sou do sexo Feminino',                           1),
            ('q3',  'masculino',           'Sou do sexo Masculino',                          2),
            ('q4',  'solteiro',            'Solteiro(o)',                                    1),
            ('q4',  'casado',              'Casado(o)',                                      2),
            ('q4',  'separado',            'Separado(o)',                                    3),
            ('q4',  'viuvo',               'Viúvo(o)',                                       4),
            ('q5',  'sim',                 'Sim',                                            1),
            ('q5',  'nao',                 'Não',                                            2),
            ('q6',  'ate1000',             'Até R$ 1.000,00',                                1),
            ('q6',  '1101a2500',           'De R$ 1.101,00 a R$ 2.500,00',                   2),
            ('q6',  '2501a4000',           'De R$ 2.501,00 a R$ 4.000,00',                   3),
            ('q6',  '4001a10000',          'De R$ 4.001,00 a R$ 10.000,00',                  4),
            ('q6',  'acima10000',          'Acima de R$ 10.000,00',                          5),
            ('q7',  'clt',                 'Funcionário CLT',                                1),
            ('q7',  'pj',                  'Funcionário PJ',                                 2),
            ('q7',  'publico',             'Funcionário Público',                            3),
            ('q7',  'autonomo',            'Autônomo',                                       4),
            ('q7',  'aposentado',          'Aposentado',                                     5),
            ('q7',  'liberal',             'Profissional Liberal',                           6),
            ('q7',  'empresario',          'Empresário',                                     7),
            ('q7',  'desempregado',        'Estou desempregado no momento',                  8),
            ('q8',  'as vezes',            'Às vezes',                                       1),
            ('q8',  'frequentemente',      'Frequentemente',                                 2),
            ('q8',  'sempre',              'Sempre',                                         3),
            ('q8',  'raramente',           'Raramente',                                      4),
            ('q8',  'nunca',               'Nunca',                                          5),
            ('q9',  'sim',                 'Sim',                                            1),
            ('q9',  'nao',                 'Não',                                            2),
            ('q10', 'sim',                 'Sim',                                            1),
            ('q10', 'parcialmente',        'Parcialmente',                                   2),
            ('q10', 'nao',                 'Não',                                            3),
            ('q10', 'Nunca fiz',           'Nunca fiz',                                      4),
            ('q11', 'sim',                 'Sim',                                            1),
            ('q11', 'nao',                 'Não',                                            2),
            ('q12', 'sim',                 'Sim',                                            1),
            ('q12', 'nao',                 'Não',                                            2)
        ) AS t(question_key, option_key, option_text, display_order)
      )
      INSERT INTO "question_option" ("question_id", "option_key", "option_text", "display_order")
      SELECT
        q.id,
        d.option_key,
        d.option_text,
        d.display_order
      FROM fv
      INNER JOIN data d ON 1 = 1
      INNER JOIN "question" q
        ON q."form_id" = fv.form_id
       AND q."question_key" = d.question_key
      WHERE NOT EXISTS (
        SELECT 1
        FROM "question_option" qo
        WHERE qo."question_id" = q.id
          AND qo."option_key" = d.option_key
      )
    `);

    await queryRunner.query(`
      WITH fv AS (
        SELECT fv.form_id AS form_id
        FROM "form_version" fv
        WHERE fv.id = '2f76bc57-57a2-41fd-9c2c-18a726dd4fe0'::uuid
      ),
      data AS (
        SELECT * FROM (
          VALUES
            ('q1',  '18-24',               '18-24',                                          1),
            ('q1',  '25-35',               '25-35',                                          2),
            ('q1',  '36-45',               '36-45',                                          3),
            ('q1',  '46-55',               '46-55',                                          4),
            ('q1',  '56+',                 '56 ou mais',                                     5),
            ('q2',  'fundamental1',        'Ensino Fundamental 1 (1º ao 5º ano)',            1),
            ('q2',  'fundamental2',        'Ensino Fundamental 2 (6º ao 9º ano)',            2),
            ('q2',  'medio',               'Ensino Médio (1º ao 3º)',                        3),
            ('q2',  'superior-incompleto', 'Ensino Superior Incompleto',                     4),
            ('q2',  'superior',            'Ensino Superior (Graduação/Faculdade)',          5),
            ('q2',  'pos',                 'Pós-Graduação',                                  6),
            ('q2',  'mestrado',            'Mestrado',                                       7),
            ('q2',  'doutorado',           'Doutorado',                                      8),
            ('q3',  'feminino',            'Sou do sexo Feminino',                           1),
            ('q3',  'masculino',           'Sou do sexo Masculino',                          2),
            ('q4',  'solteiro',            'Solteiro(o)',                                    1),
            ('q4',  'casado',              'Casado(o)',                                      2),
            ('q4',  'separado',            'Separado(o)',                                    3),
            ('q4',  'viuvo',               'Viúvo(o)',                                       4),
            ('q5',  'sim',                 'Sim',                                            1),
            ('q5',  'nao',                 'Não',                                            2),
            ('q6',  'ate1000',             'Até R$ 1.000,00',                                1),
            ('q6',  '1101a2500',           'De R$ 1.101,00 a R$ 2.500,00',                   2),
            ('q6',  '2501a4000',           'De R$ 2.501,00 a R$ 4.000,00',                   3),
            ('q6',  '4001a10000',          'De R$ 4.001,00 a R$ 10.000,00',                  4),
            ('q6',  'acima10000',          'Acima de R$ 10.000,00',                          5),
            ('q7',  'clt',                 'Funcionário CLT',                                1),
            ('q7',  'pj',                  'Funcionário PJ',                                 2),
            ('q7',  'publico',             'Funcionário Público',                            3),
            ('q7',  'autonomo',            'Autônomo',                                       4),
            ('q7',  'aposentado',          'Aposentado',                                     5),
            ('q7',  'liberal',             'Profissional Liberal',                           6),
            ('q7',  'empresario',          'Empresário',                                     7),
            ('q7',  'desempregado',        'Estou desempregado no momento',                  8),
            ('q8',  'as vezes',            'Às vezes',                                       1),
            ('q8',  'frequentemente',      'Frequentemente',                                 2),
            ('q8',  'sempre',              'Sempre',                                         3),
            ('q8',  'raramente',           'Raramente',                                      4),
            ('q8',  'nunca',               'Nunca',                                          5),
            ('q9',  'sim',                 'Sim',                                            1),
            ('q9',  'nao',                 'Não',                                            2),
            ('q10', 'sim',                 'Sim',                                            1),
            ('q10', 'parcialmente',        'Parcialmente',                                   2),
            ('q10', 'nao',                 'Não',                                            3),
            ('q10', 'Nunca fiz',           'Nunca fiz',                                      4),
            ('q11', 'sim',                 'Sim',                                            1),
            ('q11', 'nao',                 'Não',                                            2),
            ('q12', 'sim',                 'Sim',                                            1),
            ('q12', 'nao',                 'Não',                                            2)
        ) AS t(question_key, option_key, option_text, display_order)
      )
      UPDATE "question_option" qo
      SET
        "option_text" = d.option_text,
        "display_order" = d.display_order
      FROM fv
      INNER JOIN data d ON 1 = 1
      INNER JOIN "question" q
        ON q."form_id" = fv.form_id
       AND q."question_key" = d.question_key
      WHERE qo."question_id" = q.id
        AND qo."option_key" = d.option_key
    `);

    await queryRunner.query(`
      WITH fv AS (
        SELECT fv.form_id AS form_id
        FROM "form_version" fv
        WHERE fv.id = '2f76bc57-57a2-41fd-9c2c-18a726dd4fe0'::uuid
      ),
      data AS (
        SELECT * FROM (
          VALUES
            ('q1',  '18-24',               7.13::double precision),
            ('q1',  '25-35',              14.78::double precision),
            ('q1',  '36-45',              19.25::double precision),
            ('q1',  '46-55',              18.55::double precision),
            ('q1',  '56+',                14.6::double precision),
            ('q2',  'fundamental1',        6.42::double precision),
            ('q2',  'fundamental2',        7.64::double precision),
            ('q2',  'medio',               8.88::double precision),
            ('q2',  'superior-incompleto',14.1::double precision),
            ('q2',  'superior',           20.95::double precision),
            ('q2',  'pos',                23.97::double precision),
            ('q2',  'mestrado',           37.31::double precision),
            ('q2',  'doutorado',          31.24::double precision),
            ('q3',  'feminino',           12.86::double precision),
            ('q3',  'masculino',          22.18::double precision),
            ('q4',  'solteiro',           14.39::double precision),
            ('q4',  'casado',             14.57::double precision),
            ('q4',  'separado',           19.99::double precision),
            ('q4',  'viuvo',              14.63::double precision),
            ('q5',  'sim',                14.68::double precision),
            ('q5',  'nao',                18.83::double precision),
            ('q6',  'ate1000',             6.86::double precision),
            ('q6',  '1101a2500',           9.82::double precision),
            ('q6',  '2501a4000',          16.21::double precision),
            ('q6',  '4001a10000',         25.55::double precision),
            ('q6',  'acima10000',         40.83::double precision),
            ('q7',  'clt',                 8.15::double precision),
            ('q7',  'pj',                 20.61::double precision),
            ('q7',  'publico',            10.4::double precision),
            ('q7',  'autonomo',           20.61::double precision),
            ('q7',  'aposentado',         10.26::double precision),
            ('q7',  'liberal',            31.52::double precision),
            ('q7',  'empresario',         52::double precision),
            ('q7',  'desempregado',       10.44::double precision),
            ('q8',  'as vezes',           13.96::double precision),
            ('q8',  'frequentemente',     22.26::double precision),
            ('q8',  'sempre',             20.94::double precision),
            ('q8',  'raramente',          11.39::double precision),
            ('q8',  'nunca',               6.73::double precision),
            ('q9',  'sim',                29.04::double precision),
            ('q9',  'nao',                 8.31::double precision),
            ('q10', 'sim',                13.89::double precision),
            ('q10', 'parcialmente',       23.51::double precision),
            ('q10', 'nao',                16.32::double precision),
            ('q10', 'Nunca fiz',          11.24::double precision),
            ('q11', 'sim',                 0::double precision),
            ('q11', 'nao',                 0::double precision),
            ('q12', 'sim',                 0::double precision),
            ('q12', 'nao',                 0::double precision)
        ) AS t(question_key, option_key, points)
      )
      INSERT INTO "leadscore_option_points" ("leadscore_id", "question_id", "option_id", "points")
      SELECT
        '7c9e8ea7-90c7-4d2c-b723-78a5bc4276c1'::uuid,
        q.id,
        qo.id,
        d.points
      FROM fv
      INNER JOIN data d ON 1 = 1
      INNER JOIN "question" q
        ON q."form_id" = fv.form_id
       AND q."question_key" = d.question_key
      INNER JOIN "question_option" qo
        ON qo."question_id" = q.id
       AND qo."option_key" = d.option_key
      WHERE NOT EXISTS (
        SELECT 1
        FROM "leadscore_option_points" lop
        WHERE lop."leadscore_id" = '7c9e8ea7-90c7-4d2c-b723-78a5bc4276c1'::uuid
          AND lop."question_id" = q.id
          AND lop."option_id" = qo.id
      )
    `);

    await queryRunner.query(`
      WITH fv AS (
        SELECT fv.form_id AS form_id
        FROM "form_version" fv
        WHERE fv.id = '2f76bc57-57a2-41fd-9c2c-18a726dd4fe0'::uuid
      ),
      data AS (
        SELECT * FROM (
          VALUES
            ('q1',  '18-24',               7.13::double precision),
            ('q1',  '25-35',              14.78::double precision),
            ('q1',  '36-45',              19.25::double precision),
            ('q1',  '46-55',              18.55::double precision),
            ('q1',  '56+',                14.6::double precision),
            ('q2',  'fundamental1',        6.42::double precision),
            ('q2',  'fundamental2',        7.64::double precision),
            ('q2',  'medio',               8.88::double precision),
            ('q2',  'superior-incompleto',14.1::double precision),
            ('q2',  'superior',           20.95::double precision),
            ('q2',  'pos',                23.97::double precision),
            ('q2',  'mestrado',           37.31::double precision),
            ('q2',  'doutorado',          31.24::double precision),
            ('q3',  'feminino',           12.86::double precision),
            ('q3',  'masculino',          22.18::double precision),
            ('q4',  'solteiro',           14.39::double precision),
            ('q4',  'casado',             14.57::double precision),
            ('q4',  'separado',           19.99::double precision),
            ('q4',  'viuvo',              14.63::double precision),
            ('q5',  'sim',                14.68::double precision),
            ('q5',  'nao',                18.83::double precision),
            ('q6',  'ate1000',             6.86::double precision),
            ('q6',  '1101a2500',           9.82::double precision),
            ('q6',  '2501a4000',          16.21::double precision),
            ('q6',  '4001a10000',         25.55::double precision),
            ('q6',  'acima10000',         40.83::double precision),
            ('q7',  'clt',                 8.15::double precision),
            ('q7',  'pj',                 20.61::double precision),
            ('q7',  'publico',            10.4::double precision),
            ('q7',  'autonomo',           20.61::double precision),
            ('q7',  'aposentado',         10.26::double precision),
            ('q7',  'liberal',            31.52::double precision),
            ('q7',  'empresario',         52::double precision),
            ('q7',  'desempregado',       10.44::double precision),
            ('q8',  'as vezes',           13.96::double precision),
            ('q8',  'frequentemente',     22.26::double precision),
            ('q8',  'sempre',             20.94::double precision),
            ('q8',  'raramente',          11.39::double precision),
            ('q8',  'nunca',               6.73::double precision),
            ('q9',  'sim',                29.04::double precision),
            ('q9',  'nao',                 8.31::double precision),
            ('q10', 'sim',                13.89::double precision),
            ('q10', 'parcialmente',       23.51::double precision),
            ('q10', 'nao',                16.32::double precision),
            ('q10', 'Nunca fiz',          11.24::double precision),
            ('q11', 'sim',                 0::double precision),
            ('q11', 'nao',                 0::double precision),
            ('q12', 'sim',                 0::double precision),
            ('q12', 'nao',                 0::double precision)
        ) AS t(question_key, option_key, points)
      )
      UPDATE "leadscore_option_points" lop
      SET
        "points" = d.points
      FROM fv
      INNER JOIN data d ON 1 = 1
      INNER JOIN "question" q
        ON q."form_id" = fv.form_id
       AND q."question_key" = d.question_key
      INNER JOIN "question_option" qo
        ON qo."question_id" = q.id
       AND qo."option_key" = d.option_key
      WHERE lop."leadscore_id" = '7c9e8ea7-90c7-4d2c-b723-78a5bc4276c1'::uuid
        AND lop."question_id" = q.id
        AND lop."option_id" = qo.id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "leadscore_option_points" lop
      USING "question" q, "form_version" fv
      WHERE lop."question_id" = q."id"
        AND q."form_id" = fv."form_id"
        AND fv."id" = '2f76bc57-57a2-41fd-9c2c-18a726dd4fe0'::uuid
        AND lop."leadscore_id" = '7c9e8ea7-90c7-4d2c-b723-78a5bc4276c1'::uuid
        AND q."question_key" IN ('q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11', 'q12')
    `);

    await queryRunner.query(`
      DELETE FROM "form_version_question" fvq
      USING "question" q
      WHERE fvq."question_id" = q."id"
        AND fvq."form_version_id" = '2f76bc57-57a2-41fd-9c2c-18a726dd4fe0'::uuid
        AND q."question_key" IN ('q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11', 'q12', 'q13')
    `);

    await queryRunner.query(`
      DELETE FROM "question_option" qo
      USING "question" q, "form_version" fv
      WHERE qo."question_id" = q."id"
        AND q."form_id" = fv."form_id"
        AND fv."id" = '2f76bc57-57a2-41fd-9c2c-18a726dd4fe0'::uuid
        AND q."question_key" IN ('q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11', 'q12')
        AND NOT EXISTS (
          SELECT 1 FROM "form_answer" fa WHERE fa."option_id" = qo."id"
        )
        AND NOT EXISTS (
          SELECT 1 FROM "leadscore_option_points" lop WHERE lop."option_id" = qo."id"
        )
    `);

    await queryRunner.query(`
      DELETE FROM "question" q
      USING "form_version" fv
      WHERE q."form_id" = fv."form_id"
        AND fv."id" = '2f76bc57-57a2-41fd-9c2c-18a726dd4fe0'::uuid
        AND q."question_key" IN ('q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11', 'q12', 'q13')
        AND NOT EXISTS (
          SELECT 1 FROM "question_option" qo WHERE qo."question_id" = q."id"
        )
        AND NOT EXISTS (
          SELECT 1 FROM "form_answer" fa WHERE fa."question_id" = q."id"
        )
        AND NOT EXISTS (
          SELECT 1 FROM "form_version_question" fvq WHERE fvq."question_id" = q."id"
        )
        AND NOT EXISTS (
          SELECT 1 FROM "leadscore_option_points" lop WHERE lop."question_id" = q."id"
        )
        AND NOT EXISTS (
          SELECT 1 FROM "leadscore_range_points" lrp WHERE lrp."question_id" = q."id"
        )
    `);
  }
}
