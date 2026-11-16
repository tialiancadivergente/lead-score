import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGoogleSheetsOutbox1783400000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE google_sheets_outbox (
      id uuid PRIMARY KEY,
      capture_id uuid NOT NULL REFERENCES capture(id) ON DELETE CASCADE,
      spreadsheet_id text NOT NULL,
      sheet_name text NOT NULL,
      sheet_id integer NOT NULL,
      values jsonb NOT NULL,
      sheet_row integer CHECK (sheet_row >= 2),
      attempt_count integer NOT NULL DEFAULT 0,
      next_attempt_at timestamptz NOT NULL DEFAULT now(),
      last_error text,
      synced_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT UQ_google_sheets_capture_destination
        UNIQUE (capture_id, spreadsheet_id, sheet_id),
      CONSTRAINT UQ_google_sheets_destination_row
        UNIQUE (spreadsheet_id, sheet_id, sheet_row)
    )`);
    await runner.query(`CREATE INDEX IDX_google_sheets_outbox_pending
      ON google_sheets_outbox (next_attempt_at, created_at)
      WHERE synced_at IS NULL`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE google_sheets_outbox');
  }
}
