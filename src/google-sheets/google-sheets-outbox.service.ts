import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { EntityManager } from 'typeorm';
import { Capture } from '../database/entities/capture/capture.entity';

@Injectable()
export class GoogleSheetsOutboxService {
  constructor(private readonly config: ConfigService) {}

  async enqueue(
    manager: EntityManager,
    capture: Capture,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (this.config.get<string>('GOOGLE_SHEETS_ENABLED', 'false') !== 'true') {
      return;
    }

    const spreadsheetId = this.config.get<string>('GOOGLE_SHEETS_SPREADSHEET_ID');
    const sheetName = this.config.get<string>('GOOGLE_SHEETS_SHEET_NAME', 'Lead');
    const sheetId = Number(this.config.get<string>('GOOGLE_SHEETS_SHEET_ID'));
    if (!spreadsheetId || !sheetName || !Number.isSafeInteger(sheetId) || sheetId < 0) {
      throw new Error('Destino Google Sheets ausente ou invalido.');
    }

    const text = (...values: unknown[]): string => {
      for (const value of values) {
        if (typeof value === 'string' && value.trim()) return value.trim();
      }
      return '';
    };
    const values = [
      capture.id,
      (capture.occurred_at ?? capture.created_at).toISOString(),
      text(payload.name, capture.person?.nome_consolidado),
      text(payload.email).toLowerCase(),
      text(payload.telefone, payload.phone),
      text(payload.launch, capture.launch?.name),
      text(payload.season, capture.season?.name),
      capture.tag_id,
      text(capture.utm_source),
      text(capture.utm_medium),
      text(capture.utm_campaign),
      text(capture.utm_content),
      text(capture.utm_term),
      text(capture.utm_id),
    ];

    // This manager belongs to the capture transaction: both writes commit together.
    await manager.query(
      `INSERT INTO google_sheets_outbox
        (id, capture_id, spreadsheet_id, sheet_name, sheet_id, values)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       ON CONFLICT (capture_id, spreadsheet_id, sheet_id) DO NOTHING`,
      [randomUUID(), capture.id, spreadsheetId, sheetName, sheetId, JSON.stringify(values)],
    );
  }
}
