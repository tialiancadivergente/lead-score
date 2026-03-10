import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedSeasonForLaunch1770000000014 implements MigrationInterface {
  name = 'SeedSeasonForLaunch1770000000014';

  private readonly launchName = 'oro';
  private readonly seasonName = 'nov26';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "season" ("name", "active", "launch_id")
      SELECT '${this.seasonName}', true, l."id"
      FROM "launch" l
      WHERE LOWER(l."name") = LOWER('${this.launchName}')
        AND NOT EXISTS (
        SELECT 1
        FROM "season" s
        INNER JOIN "launch" l2 ON l2."id" = s."launch_id"
        WHERE LOWER(l2."name") = LOWER('${this.launchName}')
          AND LOWER(s."name") = LOWER('${this.seasonName}')
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "season" s
      USING "launch" l
      WHERE s."launch_id" = l."id"
        AND LOWER(l."name") = LOWER('${this.launchName}')
        AND LOWER("name") = LOWER('${this.seasonName}')
    `);
  }
}
