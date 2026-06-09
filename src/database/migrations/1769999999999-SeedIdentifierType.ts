import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedIdentifierType1769999999999 implements MigrationInterface {
  name = 'SeedIdentifierType1769999999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "identifier_type" ("code", "description")
      VALUES
        ('EMAIL', 'Email'),
        ('PHONE', 'Telefone'),
        ('CPF', 'CPF')
      ON CONFLICT ("code") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "identifier_type"
      WHERE "code" IN ('EMAIL', 'PHONE', 'CPF')
    `);
  }
}
