import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameNotificationMetricToMetrics1781800000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE launch_dashboard_config
      RENAME COLUMN notification_metric TO notification_metrics
    `);
    await queryRunner.query(`
      ALTER TABLE launch_dashboard_config
      ALTER COLUMN notification_metrics TYPE text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE launch_dashboard_config
      ALTER COLUMN notification_metrics TYPE varchar(50)
    `);
    await queryRunner.query(`
      ALTER TABLE launch_dashboard_config
      RENAME COLUMN notification_metrics TO notification_metric
    `);
  }
}
