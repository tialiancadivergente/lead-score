import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateCopilotTables1781900000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'copilot_conversation',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'launch_id', type: 'uuid' },
          { name: 'user_id', type: 'uuid', isNullable: true },
          { name: 'title', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
        indices: [
          {
            name: 'IDX_copilot_conversation_launch_id',
            columnNames: ['launch_id'],
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'copilot_message',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'conversation_id', type: 'uuid' },
          { name: 'role', type: 'text' },
          { name: 'content', type: 'text', isNullable: true },
          { name: 'tool_calls', type: 'jsonb', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
        indices: [
          {
            name: 'IDX_copilot_message_conversation_id',
            columnNames: ['conversation_id'],
          },
        ],
        foreignKeys: [
          {
            name: 'FK_copilot_message_conversation',
            columnNames: ['conversation_id'],
            referencedTableName: 'copilot_conversation',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'copilot_risk_alert',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'launch_id', type: 'uuid' },
          { name: 'external_ad_id', type: 'text', isNullable: true },
          { name: 'ad_name', type: 'text', isNullable: true },
          { name: 'rule_key', type: 'text' },
          { name: 'detected_on', type: 'date' },
          { name: 'severity', type: 'text' },
          { name: 'title', type: 'text' },
          { name: 'narrative', type: 'text', isNullable: true },
          { name: 'recommendation', type: 'text', isNullable: true },
          { name: 'current_value', type: 'numeric', isNullable: true },
          { name: 'baseline_value', type: 'numeric', isNullable: true },
          { name: 'pct_diff', type: 'numeric', isNullable: true },
          { name: 'status', type: 'text', default: `'open'` },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
        indices: [
          {
            name: 'IDX_copilot_risk_alert_launch_status',
            columnNames: ['launch_id', 'status'],
          },
        ],
      }),
      true,
    );
    // Dedupe key: nao recriar o mesmo alerta pro mesmo anuncio/regra/dia.
    // external_ad_id pode ser nulo (alerta de nivel de lancamento) -> usamos
    // COALESCE pra que NULLs colidam entre si (comportamento padrao do
    // Postgres trataria cada NULL como distinto).
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_copilot_risk_alert_dedupe"
      ON "copilot_risk_alert" ("launch_id", COALESCE("external_ad_id", ''), "rule_key", "detected_on")
    `);

    await queryRunner.createTable(
      new Table({
        name: 'copilot_config',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'launch_id', type: 'uuid', isUnique: true },
          { name: 'risk_sensitivity', type: 'text', default: `'medium'` },
          { name: 'enabled_rules', type: 'text', isNullable: true },
          { name: 'extra_context', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('copilot_config');
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_copilot_risk_alert_dedupe"`,
    );
    await queryRunner.dropTable('copilot_risk_alert');
    await queryRunner.dropTable('copilot_message');
    await queryRunner.dropTable('copilot_conversation');
  }
}
