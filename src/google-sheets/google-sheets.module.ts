import { Module } from '@nestjs/common';
// Integracao com Google Sheets temporariamente desabilitada.
// import { GoogleSheetsClient } from './google-sheets.client';
// import { GoogleSheetsOutboxService } from './google-sheets-outbox.service';
// import { GoogleSheetsWorker } from './google-sheets.worker';

@Module({
  // providers: [GoogleSheetsClient, GoogleSheetsOutboxService, GoogleSheetsWorker],
  // exports: [GoogleSheetsOutboxService],
})
export class GoogleSheetsModule {}
