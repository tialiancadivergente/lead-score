import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedSeasonJun26ForWodLaunch1782000000005
  implements MigrationInterface
{
  name = 'SeedSeasonJun26ForWodLaunch1782000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "season" ("name", "active", "launch_id")
      SELECT 'JUN26', true, l."id"
      FROM "launch" l
      WHERE LOWER(l."name") = 'wod'
        AND NOT EXISTS (
          SELECT 1
          FROM "season" s
          WHERE s."launch_id" = l."id"
            AND LOWER(s."name") = 'jun26'
        )
    `);

    await queryRunner.query(`
      UPDATE "season" s
      SET "active" = true
      FROM "launch" l
      WHERE s."launch_id" = l."id"
        AND LOWER(l."name") = 'wod'
        AND LOWER(s."name") = 'jun26'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "season" s
      USING "launch" l
      WHERE s."launch_id" = l."id"
        AND LOWER(l."name") = 'wod'
        AND LOWER(s."name") = 'jun26'
    `);
  }
}
