import { MigrationInterface, QueryRunner } from 'typeorm';

const actions = ['view', 'create', 'update', 'delete'];

export class AddCopilotRbacModule1781900000004 implements MigrationInterface {
  name = 'AddCopilotRbacModule1781900000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const action of actions) {
      await queryRunner.query(
        `
          INSERT INTO "permissions" ("module", "action")
          VALUES ($1, $2)
          ON CONFLICT ("module", "action") DO NOTHING
        `,
        ['copilot', action],
      );
    }

    // super_admin/admin ja tem tudo via CROSS JOIN na seed original; aqui so
    // precisamos garantir que os dois papeis recebam as novas permissoes.
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.name IN ('super_admin', 'admin') AND p.module = 'copilot'
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      JOIN "permissions" p ON p.action = 'view' AND p.module = 'copilot'
      WHERE r.name = 'viewer'
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE "permission_id" IN (SELECT id FROM "permissions" WHERE module = 'copilot')
    `);
    await queryRunner.query(
      `DELETE FROM "permissions" WHERE module = 'copilot'`,
    );
  }
}
