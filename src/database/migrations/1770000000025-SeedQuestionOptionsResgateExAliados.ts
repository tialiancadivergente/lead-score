import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedQuestionOptionsResgateExAliados1770000000025
  implements MigrationInterface
{
  name = 'SeedQuestionOptionsResgateExAliados1770000000025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "question_option" ("question_id", "option_key", "option_text", "display_order")
      SELECT
        d.question_id,
        d.option_key,
        d.option_text,
        d.display_order
      FROM (
        VALUES
          ('46-55', '46-55', 4, '06fd9510-d974-473b-a60e-6ff31e2ab984'::uuid),
          ('25-35', '25-35', 2, '06fd9510-d974-473b-a60e-6ff31e2ab984'::uuid),
          ('56+', '56 ou mais', 5, '06fd9510-d974-473b-a60e-6ff31e2ab984'::uuid),
          ('36-45', '36-45', 3, '06fd9510-d974-473b-a60e-6ff31e2ab984'::uuid),
          ('18-24', '18-24', 1, '06fd9510-d974-473b-a60e-6ff31e2ab984'::uuid),

          ('mestrado', 'Mestrado', 7, '5134517a-78df-4a79-b979-a54862990aed'::uuid),
          ('fundamental1', 'Ensino Fundamental 1 (1º ao 5º ano)', 1, '5134517a-78df-4a79-b979-a54862990aed'::uuid),
          ('fundamental2', 'Ensino Fundamental 2 (6º ao 9º ano)', 2, '5134517a-78df-4a79-b979-a54862990aed'::uuid),
          ('superior-incompleto', 'Ensino Superior Incompleto', 4, '5134517a-78df-4a79-b979-a54862990aed'::uuid),
          ('doutorado', 'Doutorado', 8, '5134517a-78df-4a79-b979-a54862990aed'::uuid),
          ('pos', 'Pós-Graduação', 6, '5134517a-78df-4a79-b979-a54862990aed'::uuid),
          ('medio', 'Ensino Médio (1º ao 3º)', 3, '5134517a-78df-4a79-b979-a54862990aed'::uuid),
          ('superior', 'Ensino Superior (Graduação/Faculdade)', 5, '5134517a-78df-4a79-b979-a54862990aed'::uuid),

          ('feminino', 'Sou do sexo Feminino', 1, 'a0a80d9d-a731-44ce-b602-e38e70e18651'::uuid),
          ('masculino', 'Sou do sexo Masculino', 2, 'a0a80d9d-a731-44ce-b602-e38e70e18651'::uuid),

          ('viuvo', 'Viúvo(o)', 4, 'dbb89d15-6835-4634-b40a-0c06ec1af7c8'::uuid),
          ('separado', 'Separado(o)', 3, 'dbb89d15-6835-4634-b40a-0c06ec1af7c8'::uuid),
          ('casado', 'Casado(o)', 2, 'dbb89d15-6835-4634-b40a-0c06ec1af7c8'::uuid),
          ('solteiro', 'Solteiro(o)', 1, 'dbb89d15-6835-4634-b40a-0c06ec1af7c8'::uuid),

          ('sim', 'Sim', 1, '9eaef8a4-5d7d-4ab0-ae35-6d57aa43eb9e'::uuid),
          ('nao', 'Não', 2, '9eaef8a4-5d7d-4ab0-ae35-6d57aa43eb9e'::uuid),

          ('ate1000', 'Até R$ 1.000,00', 1, '0520d6de-ec36-41ad-a886-c9aedd5588d9'::uuid),
          ('4001a10000', 'De R$ 4.001,00 a R$ 10.000,00', 4, '0520d6de-ec36-41ad-a886-c9aedd5588d9'::uuid),
          ('1101a2500', 'De R$ 1.101,00 a R$ 2.500,00', 2, '0520d6de-ec36-41ad-a886-c9aedd5588d9'::uuid),
          ('acima10000', 'Acima de R$ 10.000,00', 5, '0520d6de-ec36-41ad-a886-c9aedd5588d9'::uuid),
          ('2501a4000', 'De R$ 2.501,00 a R$ 4.000,00', 3, '0520d6de-ec36-41ad-a886-c9aedd5588d9'::uuid),

          ('autonomo', 'Autônomo', 4, 'a3609ebd-19dc-4ce7-aa89-a3d7af1dce0b'::uuid),
          ('pj', 'Funcionário PJ', 2, 'a3609ebd-19dc-4ce7-aa89-a3d7af1dce0b'::uuid),
          ('liberal', 'Profissional Liberal', 6, 'a3609ebd-19dc-4ce7-aa89-a3d7af1dce0b'::uuid),
          ('clt', 'Funcionário CLT', 1, 'a3609ebd-19dc-4ce7-aa89-a3d7af1dce0b'::uuid),
          ('publico', 'Funcionário Público', 3, 'a3609ebd-19dc-4ce7-aa89-a3d7af1dce0b'::uuid),
          ('empresario', 'Empresário', 7, 'a3609ebd-19dc-4ce7-aa89-a3d7af1dce0b'::uuid),
          ('desempregado', 'Estou desempregado no momento', 8, 'a3609ebd-19dc-4ce7-aa89-a3d7af1dce0b'::uuid),
          ('aposentado', 'Aposentado', 5, 'a3609ebd-19dc-4ce7-aa89-a3d7af1dce0b'::uuid),

          ('as vezes', 'Às vezes', 1, '735c61e0-7f70-4a74-aebc-484f6e4739f7'::uuid),
          ('frequentemente', 'Frequentemente', 2, '735c61e0-7f70-4a74-aebc-484f6e4739f7'::uuid),
          ('sempre', 'Sempre', 3, '735c61e0-7f70-4a74-aebc-484f6e4739f7'::uuid),
          ('nunca', 'Nunca', 5, '735c61e0-7f70-4a74-aebc-484f6e4739f7'::uuid),
          ('raramente', 'Raramente', 4, '735c61e0-7f70-4a74-aebc-484f6e4739f7'::uuid),

          ('nao', 'Não', 2, 'fe64bb3c-7fb8-4dc2-82f9-0044ad0beb05'::uuid),
          ('sim', 'Sim', 1, 'fe64bb3c-7fb8-4dc2-82f9-0044ad0beb05'::uuid),

          ('parcialmente', 'Parcialmente', 2, '88aaee19-203c-4f8a-88d1-9a2f47bd2f16'::uuid),
          ('Nunca fiz', 'Nunca fiz', 4, '88aaee19-203c-4f8a-88d1-9a2f47bd2f16'::uuid),
          ('nao', 'Não', 3, '88aaee19-203c-4f8a-88d1-9a2f47bd2f16'::uuid),
          ('sim', 'Sim', 1, '88aaee19-203c-4f8a-88d1-9a2f47bd2f16'::uuid)
      ) AS d(option_key, option_text, display_order, question_id)
      WHERE NOT EXISTS (
        SELECT 1
        FROM "question_option" qo
        WHERE qo."question_id" = d.question_id
          AND qo."option_key" = d.option_key
      )
    `);

    await queryRunner.query(`
      UPDATE "question_option" qo
      SET
        "option_text" = d.option_text,
        "display_order" = d.display_order
      FROM (
        VALUES
          ('46-55', '46-55', 4, '06fd9510-d974-473b-a60e-6ff31e2ab984'::uuid),
          ('25-35', '25-35', 2, '06fd9510-d974-473b-a60e-6ff31e2ab984'::uuid),
          ('56+', '56 ou mais', 5, '06fd9510-d974-473b-a60e-6ff31e2ab984'::uuid),
          ('36-45', '36-45', 3, '06fd9510-d974-473b-a60e-6ff31e2ab984'::uuid),
          ('18-24', '18-24', 1, '06fd9510-d974-473b-a60e-6ff31e2ab984'::uuid),

          ('mestrado', 'Mestrado', 7, '5134517a-78df-4a79-b979-a54862990aed'::uuid),
          ('fundamental1', 'Ensino Fundamental 1 (1º ao 5º ano)', 1, '5134517a-78df-4a79-b979-a54862990aed'::uuid),
          ('fundamental2', 'Ensino Fundamental 2 (6º ao 9º ano)', 2, '5134517a-78df-4a79-b979-a54862990aed'::uuid),
          ('superior-incompleto', 'Ensino Superior Incompleto', 4, '5134517a-78df-4a79-b979-a54862990aed'::uuid),
          ('doutorado', 'Doutorado', 8, '5134517a-78df-4a79-b979-a54862990aed'::uuid),
          ('pos', 'Pós-Graduação', 6, '5134517a-78df-4a79-b979-a54862990aed'::uuid),
          ('medio', 'Ensino Médio (1º ao 3º)', 3, '5134517a-78df-4a79-b979-a54862990aed'::uuid),
          ('superior', 'Ensino Superior (Graduação/Faculdade)', 5, '5134517a-78df-4a79-b979-a54862990aed'::uuid),

          ('feminino', 'Sou do sexo Feminino', 1, 'a0a80d9d-a731-44ce-b602-e38e70e18651'::uuid),
          ('masculino', 'Sou do sexo Masculino', 2, 'a0a80d9d-a731-44ce-b602-e38e70e18651'::uuid),

          ('viuvo', 'Viúvo(o)', 4, 'dbb89d15-6835-4634-b40a-0c06ec1af7c8'::uuid),
          ('separado', 'Separado(o)', 3, 'dbb89d15-6835-4634-b40a-0c06ec1af7c8'::uuid),
          ('casado', 'Casado(o)', 2, 'dbb89d15-6835-4634-b40a-0c06ec1af7c8'::uuid),
          ('solteiro', 'Solteiro(o)', 1, 'dbb89d15-6835-4634-b40a-0c06ec1af7c8'::uuid),

          ('sim', 'Sim', 1, '9eaef8a4-5d7d-4ab0-ae35-6d57aa43eb9e'::uuid),
          ('nao', 'Não', 2, '9eaef8a4-5d7d-4ab0-ae35-6d57aa43eb9e'::uuid),

          ('ate1000', 'Até R$ 1.000,00', 1, '0520d6de-ec36-41ad-a886-c9aedd5588d9'::uuid),
          ('4001a10000', 'De R$ 4.001,00 a R$ 10.000,00', 4, '0520d6de-ec36-41ad-a886-c9aedd5588d9'::uuid),
          ('1101a2500', 'De R$ 1.101,00 a R$ 2.500,00', 2, '0520d6de-ec36-41ad-a886-c9aedd5588d9'::uuid),
          ('acima10000', 'Acima de R$ 10.000,00', 5, '0520d6de-ec36-41ad-a886-c9aedd5588d9'::uuid),
          ('2501a4000', 'De R$ 2.501,00 a R$ 4.000,00', 3, '0520d6de-ec36-41ad-a886-c9aedd5588d9'::uuid),

          ('autonomo', 'Autônomo', 4, 'a3609ebd-19dc-4ce7-aa89-a3d7af1dce0b'::uuid),
          ('pj', 'Funcionário PJ', 2, 'a3609ebd-19dc-4ce7-aa89-a3d7af1dce0b'::uuid),
          ('liberal', 'Profissional Liberal', 6, 'a3609ebd-19dc-4ce7-aa89-a3d7af1dce0b'::uuid),
          ('clt', 'Funcionário CLT', 1, 'a3609ebd-19dc-4ce7-aa89-a3d7af1dce0b'::uuid),
          ('publico', 'Funcionário Público', 3, 'a3609ebd-19dc-4ce7-aa89-a3d7af1dce0b'::uuid),
          ('empresario', 'Empresário', 7, 'a3609ebd-19dc-4ce7-aa89-a3d7af1dce0b'::uuid),
          ('desempregado', 'Estou desempregado no momento', 8, 'a3609ebd-19dc-4ce7-aa89-a3d7af1dce0b'::uuid),
          ('aposentado', 'Aposentado', 5, 'a3609ebd-19dc-4ce7-aa89-a3d7af1dce0b'::uuid),

          ('as vezes', 'Às vezes', 1, '735c61e0-7f70-4a74-aebc-484f6e4739f7'::uuid),
          ('frequentemente', 'Frequentemente', 2, '735c61e0-7f70-4a74-aebc-484f6e4739f7'::uuid),
          ('sempre', 'Sempre', 3, '735c61e0-7f70-4a74-aebc-484f6e4739f7'::uuid),
          ('nunca', 'Nunca', 5, '735c61e0-7f70-4a74-aebc-484f6e4739f7'::uuid),
          ('raramente', 'Raramente', 4, '735c61e0-7f70-4a74-aebc-484f6e4739f7'::uuid),

          ('nao', 'Não', 2, 'fe64bb3c-7fb8-4dc2-82f9-0044ad0beb05'::uuid),
          ('sim', 'Sim', 1, 'fe64bb3c-7fb8-4dc2-82f9-0044ad0beb05'::uuid),

          ('parcialmente', 'Parcialmente', 2, '88aaee19-203c-4f8a-88d1-9a2f47bd2f16'::uuid),
          ('Nunca fiz', 'Nunca fiz', 4, '88aaee19-203c-4f8a-88d1-9a2f47bd2f16'::uuid),
          ('nao', 'Não', 3, '88aaee19-203c-4f8a-88d1-9a2f47bd2f16'::uuid),
          ('sim', 'Sim', 1, '88aaee19-203c-4f8a-88d1-9a2f47bd2f16'::uuid)
      ) AS d(option_key, option_text, display_order, question_id)
      WHERE qo."question_id" = d.question_id
        AND qo."option_key" = d.option_key
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "question_option" qo
      USING (
        VALUES
          ('46-55', '06fd9510-d974-473b-a60e-6ff31e2ab984'::uuid),
          ('25-35', '06fd9510-d974-473b-a60e-6ff31e2ab984'::uuid),
          ('56+', '06fd9510-d974-473b-a60e-6ff31e2ab984'::uuid),
          ('36-45', '06fd9510-d974-473b-a60e-6ff31e2ab984'::uuid),
          ('18-24', '06fd9510-d974-473b-a60e-6ff31e2ab984'::uuid),

          ('mestrado', '5134517a-78df-4a79-b979-a54862990aed'::uuid),
          ('fundamental1', '5134517a-78df-4a79-b979-a54862990aed'::uuid),
          ('fundamental2', '5134517a-78df-4a79-b979-a54862990aed'::uuid),
          ('superior-incompleto', '5134517a-78df-4a79-b979-a54862990aed'::uuid),
          ('doutorado', '5134517a-78df-4a79-b979-a54862990aed'::uuid),
          ('pos', '5134517a-78df-4a79-b979-a54862990aed'::uuid),
          ('medio', '5134517a-78df-4a79-b979-a54862990aed'::uuid),
          ('superior', '5134517a-78df-4a79-b979-a54862990aed'::uuid),

          ('feminino', 'a0a80d9d-a731-44ce-b602-e38e70e18651'::uuid),
          ('masculino', 'a0a80d9d-a731-44ce-b602-e38e70e18651'::uuid),

          ('viuvo', 'dbb89d15-6835-4634-b40a-0c06ec1af7c8'::uuid),
          ('separado', 'dbb89d15-6835-4634-b40a-0c06ec1af7c8'::uuid),
          ('casado', 'dbb89d15-6835-4634-b40a-0c06ec1af7c8'::uuid),
          ('solteiro', 'dbb89d15-6835-4634-b40a-0c06ec1af7c8'::uuid),

          ('sim', '9eaef8a4-5d7d-4ab0-ae35-6d57aa43eb9e'::uuid),
          ('nao', '9eaef8a4-5d7d-4ab0-ae35-6d57aa43eb9e'::uuid),

          ('ate1000', '0520d6de-ec36-41ad-a886-c9aedd5588d9'::uuid),
          ('4001a10000', '0520d6de-ec36-41ad-a886-c9aedd5588d9'::uuid),
          ('1101a2500', '0520d6de-ec36-41ad-a886-c9aedd5588d9'::uuid),
          ('acima10000', '0520d6de-ec36-41ad-a886-c9aedd5588d9'::uuid),
          ('2501a4000', '0520d6de-ec36-41ad-a886-c9aedd5588d9'::uuid),

          ('autonomo', 'a3609ebd-19dc-4ce7-aa89-a3d7af1dce0b'::uuid),
          ('pj', 'a3609ebd-19dc-4ce7-aa89-a3d7af1dce0b'::uuid),
          ('liberal', 'a3609ebd-19dc-4ce7-aa89-a3d7af1dce0b'::uuid),
          ('clt', 'a3609ebd-19dc-4ce7-aa89-a3d7af1dce0b'::uuid),
          ('publico', 'a3609ebd-19dc-4ce7-aa89-a3d7af1dce0b'::uuid),
          ('empresario', 'a3609ebd-19dc-4ce7-aa89-a3d7af1dce0b'::uuid),
          ('desempregado', 'a3609ebd-19dc-4ce7-aa89-a3d7af1dce0b'::uuid),
          ('aposentado', 'a3609ebd-19dc-4ce7-aa89-a3d7af1dce0b'::uuid),

          ('as vezes', '735c61e0-7f70-4a74-aebc-484f6e4739f7'::uuid),
          ('frequentemente', '735c61e0-7f70-4a74-aebc-484f6e4739f7'::uuid),
          ('sempre', '735c61e0-7f70-4a74-aebc-484f6e4739f7'::uuid),
          ('nunca', '735c61e0-7f70-4a74-aebc-484f6e4739f7'::uuid),
          ('raramente', '735c61e0-7f70-4a74-aebc-484f6e4739f7'::uuid),

          ('nao', 'fe64bb3c-7fb8-4dc2-82f9-0044ad0beb05'::uuid),
          ('sim', 'fe64bb3c-7fb8-4dc2-82f9-0044ad0beb05'::uuid),

          ('parcialmente', '88aaee19-203c-4f8a-88d1-9a2f47bd2f16'::uuid),
          ('Nunca fiz', '88aaee19-203c-4f8a-88d1-9a2f47bd2f16'::uuid),
          ('nao', '88aaee19-203c-4f8a-88d1-9a2f47bd2f16'::uuid),
          ('sim', '88aaee19-203c-4f8a-88d1-9a2f47bd2f16'::uuid)
      ) AS d(option_key, question_id)
      WHERE qo."question_id" = d.question_id
        AND qo."option_key" = d.option_key
        AND NOT EXISTS (
          SELECT 1 FROM "form_answer" fa WHERE fa."option_id" = qo."id"
        )
        AND NOT EXISTS (
          SELECT 1 FROM "leadscore_option_points" lop WHERE lop."option_id" = qo."id"
        )
    `);
  }
}

