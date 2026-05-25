import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateHotmartSyncScheduleTable1770000000054 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'hotmart_sync_schedule',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'name', type: 'text', isNullable: true },
          { name: 'period_preset', type: 'text' },
          { name: 'date_from', type: 'text', isNullable: true },
          { name: 'date_to', type: 'text', isNullable: true },
          { name: 'transaction_status', type: 'text', isNullable: true },
          { name: 'scheduled_time', type: 'text' },
          { name: 'active', type: 'boolean', default: 'true' },
          { name: 'last_run_at', type: 'timestamptz', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('hotmart_sync_schedule');
  }
}
