import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlatformSourceValues1770000000003 implements MigrationInterface {
  name = 'PlatformSourceValues1770000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "platform"
      SET "source" = 'FBAds_'
      WHERE "name" = 'Meta'
    `);
    await queryRunner.query(`
      UPDATE "platform"
      SET "source" = 'GGAds_'
      WHERE "name" = 'Google'
    `);
    await queryRunner.query(`
      UPDATE "platform"
      SET "source" = 'TIKTOK'
      WHERE "name" = 'TikTok'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "platform"
      SET "source" = NULL
      WHERE "name" IN ('Meta', 'Google', 'TikTok')
    `);
  }
}

