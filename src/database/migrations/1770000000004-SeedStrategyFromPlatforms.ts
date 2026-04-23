import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedStrategyFromPlatforms1770000000004 implements MigrationInterface {
  name = 'SeedStrategyFromPlatforms1770000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Cria 1 strategy por platform existente:
    // - platform.name = 'Email' => Orgânico
    // - demais => Patrocinado
    // Idempotente por platform_id (não duplica).
    await queryRunner.query(`
      INSERT INTO "strategy" ("platform_id", "name")
      SELECT
        p.id,
        CASE WHEN p.name = 'Email' THEN 'Orgânico' ELSE 'Patrocinado' END
      FROM "platform" p
      WHERE NOT EXISTS (
        SELECT 1 FROM "strategy" s WHERE s.platform_id = p.id
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove apenas as strategies criadas com os nomes do enum e vinculadas a platforms
    await queryRunner.query(`
      DELETE FROM "strategy" s
      WHERE s.platform_id IS NOT NULL
        AND s.name IN ('Orgânico', 'Patrocinado')
    `);
  }
}
