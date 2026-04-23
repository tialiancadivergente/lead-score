import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedIdentifierSource1770000000000 implements MigrationInterface {
  name = 'SeedIdentifierSource1770000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "identifier_source" ("code", "description")
      VALUES
        ('FORM', 'Formulário'),
        ('API', 'API'),
        ('MANUAL', 'Manual'),
        ('IMPORT', 'Importação'),
        ('WEBHOOK', 'Webhook')
      ON CONFLICT ("code") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "identifier_source"
      WHERE "code" IN ('FORM', 'API', 'MANUAL', 'IMPORT', 'WEBHOOK')
    `);
  }
}
