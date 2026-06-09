import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateLaunchDashboardConfigTable1770000000055 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'launch_dashboard_config',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'launch_id', type: 'uuid', isUnique: true },
          // targets
          { name: 'target_spend', type: 'numeric', isNullable: true },
          { name: 'target_leads', type: 'int', isNullable: true },
          { name: 'target_cpl', type: 'numeric', isNullable: true },
          { name: 'target_connect_rate', type: 'numeric', isNullable: true },
          { name: 'target_page_conversion', type: 'numeric', isNullable: true },
          { name: 'target_cpc', type: 'numeric', isNullable: true },
          { name: 'target_cpm', type: 'numeric', isNullable: true },
          { name: 'target_ctr', type: 'numeric', isNullable: true },
          {
            name: 'target_survey_response_rate',
            type: 'numeric',
            isNullable: true,
          },
          {
            name: 'target_consciousness_rate',
            type: 'numeric',
            isNullable: true,
          },
          {
            name: 'target_knows_elton_rate',
            type: 'numeric',
            isNullable: true,
          },
          {
            name: 'target_knows_alliance_rate',
            type: 'numeric',
            isNullable: true,
          },
          // question keys
          {
            name: 'question_key_consciousness',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'positive_option_key_consciousness',
            type: 'text',
            isNullable: true,
          },
          { name: 'question_key_knows_elton', type: 'text', isNullable: true },
          {
            name: 'positive_option_key_knows_elton',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'question_key_knows_alliance',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'positive_option_key_knows_alliance',
            type: 'text',
            isNullable: true,
          },
          // timestamps
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('launch_dashboard_config');
  }
}
