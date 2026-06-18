import * as bcrypt from 'bcrypt';
import { MigrationInterface, QueryRunner } from 'typeorm';

const modules = [
  'dashboard',
  'launch_dashboard',
  'vendas_hotmart',
  'meta_ads',
  'google_ads',
  'lead_capture',
  'vote_campaigns',
  'launch',
  'pages',
  'season',
  'forms',
  'marketing_sync',
  'marketing_sync_config',
  'users',
  'roles',
];

const actions = ['view', 'create', 'update', 'delete'];

export class CreateAuthRbac1781900000000 implements MigrationInterface {
  name = 'CreateAuthRbac1781900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.users') IS NULL AND to_regclass('public."user"') IS NOT NULL THEN
          ALTER TABLE "user" RENAME TO users;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(120) NOT NULL,
        "email" varchar(180) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "last_login_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'active'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'is_active'
        ) THEN
          ALTER TABLE "users" RENAME COLUMN "active" TO "is_active";
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'last_login'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'last_login_at'
        ) THEN
          ALTER TABLE "users" RENAME COLUMN "last_login" TO "last_login_at";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "name" TYPE varchar(120),
      ALTER COLUMN "email" TYPE varchar(180),
      ALTER COLUMN "password_hash" TYPE varchar(255)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_email" ON "users" ("email")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "roles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(60) NOT NULL,
        "description" varchar(255),
        "is_system" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_roles_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_roles_name" ON "roles" ("name")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "permissions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "module" varchar(60) NOT NULL,
        "action" varchar(20) NOT NULL,
        CONSTRAINT "PK_permissions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_permissions_module_action" UNIQUE ("module", "action")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "role_permissions" (
        "role_id" uuid NOT NULL,
        "permission_id" uuid NOT NULL,
        CONSTRAINT "PK_role_permissions" PRIMARY KEY ("role_id", "permission_id"),
        CONSTRAINT "FK_role_permissions_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_role_permissions_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_roles" (
        "user_id" uuid NOT NULL,
        "role_id" uuid NOT NULL,
        CONSTRAINT "PK_user_roles" PRIMARY KEY ("user_id", "role_id"),
        CONSTRAINT "FK_user_roles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_roles_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token_hash" varchar(255) NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        "user_agent" varchar(255),
        "ip" varchar(80),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_user_id" ON "refresh_tokens" ("user_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token_hash" varchar(255) NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "used_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_password_reset_tokens_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_password_reset_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_password_reset_tokens_user_id" ON "password_reset_tokens" ("user_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid,
        "action" varchar(120) NOT NULL,
        "resource" varchar(120) NOT NULL,
        "resource_id" varchar(120),
        "metadata" jsonb,
        "ip" varchar(80),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_audit_logs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_logs_user_id" ON "audit_logs" ("user_id")
    `);

    await this.seedPermissions(queryRunner);
    await this.seedRoles(queryRunner);
    await this.seedInitialAdmin(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "password_reset_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
  }

  private async seedPermissions(queryRunner: QueryRunner): Promise<void> {
    for (const module of modules) {
      for (const action of actions) {
        await queryRunner.query(
          `
            INSERT INTO "permissions" ("module", "action")
            VALUES ($1, $2)
            ON CONFLICT ("module", "action") DO NOTHING
          `,
          [module, action],
        );
      }
    }
  }

  private async seedRoles(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "roles" ("name", "description", "is_system")
      VALUES
        ('super_admin', 'Acesso total com bypass de permissoes', true),
        ('admin', 'Administrador do backoffice', true),
        ('viewer', 'Visualizacao de todos os modulos', false)
      ON CONFLICT ("name") DO UPDATE SET
        "description" = EXCLUDED."description",
        "is_system" = EXCLUDED."is_system",
        "updated_at" = now()
    `);

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r.name IN ('super_admin', 'admin')
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "roles" r
      JOIN "permissions" p ON p.action = 'view'
      WHERE r.name = 'viewer'
      ON CONFLICT DO NOTHING
    `);
  }

  private async seedInitialAdmin(queryRunner: QueryRunner): Promise<void> {
    const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.SEED_ADMIN_PASSWORD;
    if (!email || !password) return;

    const name = process.env.SEED_ADMIN_NAME?.trim() || 'Super Admin';
    const passwordHash = await bcrypt.hash(password, 12);

    await queryRunner.query(
      `
        INSERT INTO "users" ("name", "email", "password_hash", "is_active")
        VALUES ($1, $2, $3, true)
        ON CONFLICT ("email") DO UPDATE SET
          "name" = EXCLUDED."name",
          "password_hash" = EXCLUDED."password_hash",
          "is_active" = true,
          "updated_at" = now()
      `,
      [name, email, passwordHash],
    );

    await queryRunner.query(
      `
        INSERT INTO "user_roles" ("user_id", "role_id")
        SELECT u.id, r.id
        FROM "users" u
        JOIN "roles" r ON r.name = 'super_admin'
        WHERE u.email = $1
        ON CONFLICT DO NOTHING
      `,
      [email],
    );
  }
}
