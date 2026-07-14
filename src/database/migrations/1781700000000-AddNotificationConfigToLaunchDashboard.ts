import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationConfigToLaunchDashboard1781700000000 implements MigrationInterface {
  name = 'AddNotificationConfigToLaunchDashboard1781700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE launch_dashboard_config
        ADD COLUMN IF NOT EXISTS notification_metric   VARCHAR(50)  NULL,
        ADD COLUMN IF NOT EXISTS notification_date_from DATE         NULL,
        ADD COLUMN IF NOT EXISTS notification_date_to   DATE         NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE launch_dashboard_config
        DROP COLUMN IF EXISTS notification_metric,
        DROP COLUMN IF EXISTS notification_date_from,
        DROP COLUMN IF EXISTS notification_date_to
    `);
  }
}
