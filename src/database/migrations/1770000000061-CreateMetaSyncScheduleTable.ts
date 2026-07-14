import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMetaSyncScheduleTable1770000000061 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE meta_sync_schedule (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT,
        sync_step TEXT NOT NULL DEFAULT 'insights_bulk',
        period_preset TEXT NOT NULL DEFAULT 'last_30d',
        date_from TEXT,
        date_to TEXT,
        level TEXT NOT NULL DEFAULT 'ad',
        scheduled_time TEXT NOT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        last_run_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE IF EXISTS meta_sync_schedule;`);
  }
}
