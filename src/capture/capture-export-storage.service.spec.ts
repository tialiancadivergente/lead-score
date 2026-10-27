import { ConfigService } from '@nestjs/config';
import { CaptureExportStorageService } from './capture-export-storage.service';

describe('Export download URLs', () => {
  it('signs read-only links limited by the file expiry and forces attachment', async () => {
    const storage = new CaptureExportStorageService(
      new ConfigService({
        CAPTURE_EXPORT_BLOB_CONNECTION_STRING: `DefaultEndpointsProtocol=https;AccountName=testaccount;AccountKey=${Buffer.alloc(32, 1).toString('base64')};EndpointSuffix=core.windows.net`,
      }),
    );
    const expiry = new Date(Date.now() + 60_000);
    const link = await storage.createDownloadUrl(
      'folder/leads.csv',
      'leads.csv',
      expiry,
    );
    const url = new URL(link.url);
    expect(url.searchParams.get('sp')).toBe('r');
    expect(url.searchParams.get('spr')).toBe('https');
    expect(url.searchParams.get('rscd')).toBe(
      'attachment; filename="leads.csv"',
    );
    expect(url.searchParams.get('rscc')).toBe('private, no-store');
    expect(Date.parse(url.searchParams.get('se')!)).toBeLessThanOrEqual(
      expiry.getTime(),
    );
    expect(url.searchParams.get('sig')).toBeTruthy();
  });
});
