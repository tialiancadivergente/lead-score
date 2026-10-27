import { GoneException } from '@nestjs/common';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { Writable } from 'stream';
import ExcelJS from 'exceljs';
import { CaptureService } from './capture.service';
import { ENTITIES } from '../database/entities';
import { Capture } from '../database/entities/capture/capture.entity';

describe('Capture export', () => {
  const jobId = '8c51d3f0-0016-45e4-94e1-f3b19dc68b2e';
  let service: CaptureService;
  let jobs: any;
  let storage: any;
  let bus: any;
  let capture: any;
  let builder: any;

  beforeEach(() => {
    builder = {};
    for (const method of [
      'update',
      'set',
      'where',
      'andWhere',
      'orderBy',
      'limit',
    ]) {
      builder[method] = jest.fn().mockReturnValue(builder);
    }
    builder.execute = jest.fn().mockResolvedValue({ affected: 1 });
    builder.getMany = jest.fn().mockResolvedValue([]);
    jobs = {
      findOne: jest
        .fn()
        .mockResolvedValue({
          id: jobId,
          status: 'pending',
          filters: {},
          format: 'csv',
        }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(() => builder),
    };
    capture = {
      createQueryBuilder: jest.fn(() => ({ getCount: async () => 2 })),
    };
    storage = {
      assertAvailable: jest.fn(),
      writeFile: jest.fn(async (_name, _type, produce, uploading) => {
        await produce(
          new Writable({
            write(_chunk, _encoding, next) {
              next();
            },
          }),
        );
        await uploading();
        return {
          storage: 'azure_blob',
          path: 'test.csv',
          size: 20,
          contentType: 'text/csv',
          expiresAt: new Date(Date.now() + 60_000),
        };
      }),
      createDownloadUrl: jest
        .fn()
        .mockResolvedValue({
          url: 'https://example.invalid/file',
          expires_at: 'date',
        }),
    };
    bus = { isEnabled: () => true, publish: jest.fn() };
    service = new CaptureService(
      capture,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      jobs,
      bus,
      storage,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it('reports phases and saves completion only for the owning attempt', async () => {
    jest
      .spyOn(service, 'streamCapturesCsv')
      .mockImplementation(async (_query, _stream, progress, phase) => {
        await phase?.('exporting');
        await progress?.(2);
      });
    await service.processExportJobById(jobId);
    const calls = jobs.update.mock.calls;
    expect(calls.map(([, value]) => value.phase)).toEqual([
      'preparing',
      'exporting',
      'exporting',
      'finalizing',
      'uploading',
      'completed',
    ]);
    const tokens = new Set(calls.map(([where]) => where.lease_token));
    expect(tokens.size).toBe(1);
    expect([...tokens][0]).toMatch(/^[\da-f-]{36}$/);
    expect(calls.every(([where]) => where.status === 'processing')).toBe(true);
    expect(builder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining("interval '5 minutes'"),
    );
  });

  it('does not generate a second file for a duplicate delivery of an active job', async () => {
    builder.execute.mockResolvedValue({ affected: 0 });
    jobs.findOne.mockResolvedValue({
      id: jobId,
      status: 'processing',
      filters: {},
      format: 'csv',
    });
    await service.processExportJobById(jobId);
    expect(storage.writeFile).not.toHaveBeenCalled();
    expect(jobs.update).not.toHaveBeenCalled();
  });

  it('cannot complete an attempt whose lease has been replaced', async () => {
    jobs.update.mockResolvedValue({ affected: 0 });
    await service.processExportJobById(jobId);
    expect(storage.writeFile).not.toHaveBeenCalled();
    expect(
      jobs.update.mock.calls.some(
        ([, values]) => values.status === 'completed',
      ),
    ).toBe(false);
    expect(jobs.update.mock.calls.at(-1)[0]).toEqual(
      expect.objectContaining({ id: jobId, lease_token: expect.any(String) }),
    );
  });

  it('updates heartbeat even while file generation is waiting', async () => {
    jest.useFakeTimers();
    let release!: () => void;
    let entered!: () => void;
    const waiting = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    storage.writeFile.mockImplementation(async () => {
      entered();
      await gate;
      return {
        storage: 'azure_blob',
        path: 'file',
        size: 1,
        contentType: 'text/csv',
        expiresAt: new Date(Date.now() + 60_000),
      };
    });
    const processing = service.processExportJobById(jobId);
    try {
      await waiting;
      await jest.advanceTimersByTimeAsync(15_000);
      expect(
        jobs.update.mock.calls.some(
          ([, values]) =>
            values.heartbeat_at instanceof Date &&
            Object.keys(values).length === 1,
        ),
      ).toBe(true);
    } finally {
      release();
      await processing;
      jest.useRealTimers();
    }
  });

  it('requeues abandoned work but terminates repeated interruptions', async () => {
    builder.getMany.mockResolvedValue([
      { id: jobId, status: 'processing', attempt_count: 1 },
      { id: 'exhausted', status: 'processing', attempt_count: 3 },
    ]);
    await service.recoverExportJobs();
    expect(bus.publish).toHaveBeenCalledTimes(1);
    expect(bus.publish).toHaveBeenCalledWith(expect.any(String), { jobId });
    expect(builder.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' }),
    );
  });

  it('requires completion and a non-expired file before granting a direct link', async () => {
    jobs.findOne.mockResolvedValue({
      id: jobId,
      status: 'completed',
      expires_at: new Date(0),
    });
    await expect(service.getExportDownloadLink(jobId)).rejects.toBeInstanceOf(
      GoneException,
    );
    expect(storage.createDownloadUrl).not.toHaveBeenCalled();
    jobs.findOne.mockResolvedValue({
      id: jobId,
      status: 'completed',
      file_storage: 'azure_blob',
      file_path: 'file',
      file_name: 'leads.csv',
    });
    await expect(service.getExportDownloadLink(jobId)).resolves.toMatchObject({
      mode: 'direct',
    });
  });

  it('writes CSV in batches with correct escaping and microsecond cursor boundaries', async () => {
    const rows = Array.from({ length: 2000 }, (_, i) => ({
      id: String(i),
      created_at: new Date(),
      export_cursor_created_at: '2026-10-16T00:00:00.123456Z',
    }));
    const last = { id: 'last', created_at: new Date() };
    const batch = jest
      .spyOn(service as any, 'buildExportBatchQuery')
      .mockReturnValueOnce({ getRawMany: async () => rows })
      .mockReturnValueOnce({ getRawMany: async () => [last] });
    jest
      .spyOn(service as any, 'collectExportQuestionHeaders')
      .mockResolvedValue(['Question']);
    const answers = new Map([
      ['0', new Map([['Question', 'value,"quoted"\nline']])],
    ]);
    jest
      .spyOn(service as any, 'resolveQuizExportData')
      .mockResolvedValue({
        detailsByCapture: new Map(),
        answersByCapture: answers,
      });
    jest
      .spyOn(service as any, 'mapRowsToItems')
      .mockImplementation(async (input: any) =>
        input.map((r: any) => ({ id: r.id })),
      );
    const chunks: Buffer[] = [];
    const stream = new Writable({
      highWaterMark: 1,
      write(chunk, _encoding, next) {
        chunks.push(Buffer.from(chunk));
        setImmediate(next);
      },
    });
    const progress = jest.fn();
    await service.streamCapturesCsv({}, stream, progress);
    const expected = (service as any).buildExportCsvBuffer(
      [...rows, last].map((r) => ({ id: r.id })),
      ['Question'],
      answers,
    );
    expect(Buffer.concat(chunks)).toEqual(expected);
    expect(progress.mock.calls).toEqual([[2000], [2001]]);
    expect(batch.mock.calls[1][1]).toEqual({
      createdAt: '2026-10-16T00:00:00.123456Z',
      id: '1999',
    });
  });

  it('produces a readable XLSX and reports finalization', async () => {
    jest
      .spyOn(service as any, 'buildExportBatchQuery')
      .mockReturnValue({
        getRawMany: async () => [{ id: 'one', created_at: new Date() }],
      });
    jest
      .spyOn(service as any, 'collectExportQuestionHeaders')
      .mockResolvedValue(['Question']);
    jest
      .spyOn(service as any, 'resolveQuizExportData')
      .mockResolvedValue({
        detailsByCapture: new Map(),
        answersByCapture: new Map([['one', new Map([['Question', 'Answer']])]]),
      });
    jest
      .spyOn(service as any, 'mapRowsToItems')
      .mockResolvedValue([{ id: 'one' }]);
    const chunks: Buffer[] = [];
    const stream = new Writable({
      write(chunk, _encoding, next) {
        chunks.push(Buffer.from(chunk));
        next();
      },
    });
    const phase = jest.fn();
    await service.streamCapturesExcel({}, stream, undefined, phase);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.concat(chunks) as any);
    const sheet = workbook.worksheets[0];
    expect(sheet.rowCount).toBe(2);
    expect(sheet.getRow(2).getCell(sheet.columnCount).value).toBe('Answer');
    expect(phase.mock.calls).toEqual([['exporting'], ['finalizing']]);
  });

  it('builds a headers-only SQL query scoped to filters and the latest response', async () => {
    const ds = new DataSource({ type: 'postgres', entities: ENTITIES });
    await (ds as any).buildMetadatas();
    (service as any).captureRepo = ds.getRepository(Capture);
    const raw = jest
      .spyOn(SelectQueryBuilder.prototype, 'getRawMany')
      .mockImplementation(async function (this: SelectQueryBuilder<any>) {
        const [sql, params] = this.getQueryAndParameters();
        expect(sql).toContain('SELECT DISTINCT');
        expect(sql).toContain('NULLS LAST');
        expect(sql).not.toContain('leadscore_result');
        expect(sql).not.toContain('answer_text');
        expect(params).toContain(jobId);
        return [
          { key: 'q2', label: 'Second' },
          { key: 'q1', label: 'First' },
        ];
      });
    await expect(
      (service as any).collectExportQuestionHeaders({ launchId: jobId }),
    ).resolves.toEqual(['First', 'Second']);
    expect(raw).toHaveBeenCalledTimes(1);
  });
});
