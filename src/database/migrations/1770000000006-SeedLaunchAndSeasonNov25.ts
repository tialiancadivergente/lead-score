import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedLaunchAndSeasonNov251770000000006 implements MigrationInterface {
  name = 'SeedLaunchAndSeasonNov251770000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Launches (idempotente por name case-insensitive)
    await queryRunner.query(`
      INSERT INTO "launch" ("name", "active")
      SELECT 'oro', true
      WHERE NOT EXISTS (
        SELECT 1 FROM "launch" l WHERE LOWER(l.name) = 'oro'
      )
    `);
    await queryRunner.query(`
      INSERT INTO "launch" ("name", "active")
      SELECT 'ofrr', true
      WHERE NOT EXISTS (
        SELECT 1 FROM "launch" l WHERE LOWER(l.name) = 'ofrr'
      )
    `);
    await queryRunner.query(`
      INSERT INTO "launch" ("name", "active")
      SELECT 'odp', true
      WHERE NOT EXISTS (
        SELECT 1 FROM "launch" l WHERE LOWER(l.name) = 'odp'
      )
    `);

    // Garante ativo caso já existisse
    await queryRunner.query(`
      UPDATE "launch" SET "active" = true WHERE LOWER("name") IN ('oro', 'ofrr', 'odp')
    `);

    // Seasons: nov25 para cada launch (oro/ofrr/odp)
    await queryRunner.query(`
      INSERT INTO "season" ("name", "active", "launch_id")
      SELECT 'nov25', true, l.id
      FROM "launch" l
      WHERE LOWER(l.name) IN ('oro', 'ofrr', 'odp')
        AND NOT EXISTS (
          SELECT 1
          FROM "season" s
          WHERE s.launch_id = l.id
            AND LOWER(s.name) = 'nov25'
        )
    `);

    // Garante ativo caso já existisse
    await queryRunner.query(`
      UPDATE "season" s
      SET "active" = true
      FROM "launch" l
      WHERE s.launch_id = l.id
        AND LOWER(l.name) IN ('oro', 'ofrr', 'odp')
        AND LOWER(s.name) = 'nov25'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reversão segura: apenas desativa (evita problemas com FKs)
    await queryRunner.query(`
      UPDATE "season" s
      SET "active" = false
      FROM "launch" l
      WHERE s.launch_id = l.id
        AND LOWER(l.name) IN ('oro', 'ofrr', 'odp')
        AND LOWER(s.name) = 'nov25'
    `);

    await queryRunner.query(`
      UPDATE "launch"
      SET "active" = false
      WHERE LOWER("name") IN ('oro', 'ofrr', 'odp')
    `);
  }
}
