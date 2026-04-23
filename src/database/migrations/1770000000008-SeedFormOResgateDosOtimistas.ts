import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedFormOResgateDosOtimistas1770000000008
  implements MigrationInterface
{
  name = 'SeedFormOResgateDosOtimistas1770000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "form" ("name", "launch_id", "season_id")
      SELECT
        'O Resgate dos Otimistas',
        '4c88a392-6e6f-417e-822a-5be7221900fd'::uuid,
        '1a946392-06fa-4e35-ab62-dfbee8cd56d1'::uuid
      WHERE NOT EXISTS (
        SELECT 1
        FROM "form" f
        WHERE LOWER(f."name") = LOWER('O Resgate dos Otimistas')
          AND f."launch_id" = '4c88a392-6e6f-417e-822a-5be7221900fd'::uuid
          AND f."season_id" = '1a946392-06fa-4e35-ab62-dfbee8cd56d1'::uuid
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "form" f
      WHERE LOWER(f."name") = LOWER('O Resgate dos Otimistas')
        AND f."launch_id" = '4c88a392-6e6f-417e-822a-5be7221900fd'::uuid
        AND f."season_id" = '1a946392-06fa-4e35-ab62-dfbee8cd56d1'::uuid
        AND NOT EXISTS (
          SELECT 1
          FROM "form_version" fv
          WHERE fv."form_id" = f."id"
        )
    `);
  }
}
