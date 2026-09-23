import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditLogsPermission1783000000000
  implements MigrationInterface
{
  name = 'AddAuditLogsPermission1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "permissions" ("module", "action")
      VALUES ('audit_logs', 'view')
      ON CONFLICT ("module", "action") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.name IN ('super_admin', 'admin')
        AND p.module = 'audit_logs'
        AND p.action = 'view'
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE "permission_id" IN (
        SELECT id FROM "permissions"
        WHERE "module" = 'audit_logs'
      )
    `);
    await queryRunner.query(`
      DELETE FROM "permissions"
      WHERE "module" = 'audit_logs'
    `);
  }
}
