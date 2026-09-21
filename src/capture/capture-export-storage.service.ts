import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlobServiceClient } from '@azure/storage-blob';
import { createReadStream, createWriteStream } from 'fs';
import { mkdir, stat, unlink } from 'fs/promises';
import { basename, join, resolve } from 'path';
import type { Readable } from 'stream';
import type { Writable } from 'stream';
import { finished } from 'stream/promises';

export type CaptureExportStorageKind = 'local' | 'azure_blob';

export type CaptureExportStoredFile = {
  storage: CaptureExportStorageKind;
  path: string;
  size: number;
  contentType: string;
  expiresAt: Date;
};

@Injectable()
export class CaptureExportStorageService {
  private readonly logger = new Logger(CaptureExportStorageService.name);
  private readonly localDir: string;
  private readonly blobContainerName: string;
  private readonly blobClient: BlobServiceClient | null;

  constructor(private readonly config: ConfigService) {
    this.localDir = resolve(
      this.config.get<string>(
        'CAPTURE_EXPORT_LOCAL_DIR',
        'tmp/capture-exports',
      ),
    );
    this.blobContainerName = this.config.get<string>(
      'CAPTURE_EXPORT_BLOB_CONTAINER',
      'capture-exports',
    );

    const connectionString =
      this.config.get<string>('CAPTURE_EXPORT_BLOB_CONNECTION_STRING') ??
      this.config.get<string>('AZURE_STORAGE_CONNECTION_STRING');

    this.blobClient = connectionString
      ? BlobServiceClient.fromConnectionString(connectionString)
      : null;

    if (!this.blobClient && this.shouldRequireSharedStorage()) {
      this.logger.warn(
        'Blob Storage nao configurado para exports. Jobs em worker separado precisam de CAPTURE_EXPORT_BLOB_CONNECTION_STRING.',
      );
    }
  }

  async writeFile(
    fileName: string,
    contentType: string,
    producer: (stream: Writable) => Promise<void>,
  ): Promise<CaptureExportStoredFile> {
    await mkdir(this.localDir, { recursive: true });

    const safeFileName = basename(fileName);
    const localPath = join(this.localDir, `${Date.now()}-${safeFileName}`);
    const out = createWriteStream(localPath);

    try {
      await producer(out);
      if (!out.writableEnded) {
        out.end();
      }
      await finished(out);

      const stats = await stat(localPath);
      const expiresAt = this.buildExpiresAt();

      if (!this.blobClient) {
        if (this.shouldRequireSharedStorage()) {
          throw new Error(
            'CAPTURE_EXPORT_BLOB_CONNECTION_STRING e obrigatorio quando SERVICE_BUS_ENABLED=true. Use CAPTURE_EXPORT_ALLOW_LOCAL_STORAGE=true apenas em ambiente local.',
          );
        }

        return {
          storage: 'local',
          path: localPath,
          size: stats.size,
          contentType,
          expiresAt,
        };
      }

      const blobName = `${expiresAt.toISOString().slice(0, 10)}/${safeFileName}`;
      const containerClient = this.blobClient.getContainerClient(
        this.blobContainerName,
      );
      await containerClient.createIfNotExists();
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.uploadFile(localPath, {
        blobHTTPHeaders: { blobContentType: contentType },
      });
      await unlink(localPath).catch(() => undefined);

      return {
        storage: 'azure_blob',
        path: blobName,
        size: stats.size,
        contentType,
        expiresAt,
      };
    } catch (error) {
      out.destroy();
      await unlink(localPath).catch(() => undefined);
      throw error;
    }
  }

  async openReadStream(params: {
    storage: CaptureExportStorageKind;
    path: string;
  }): Promise<Readable> {
    if (params.storage === 'local') {
      return createReadStream(params.path);
    }

    if (!this.blobClient) {
      throw new NotFoundException(
        'Arquivo de export esta em Azure Blob, mas o storage nao esta configurado.',
      );
    }

    const containerClient = this.blobClient.getContainerClient(
      this.blobContainerName,
    );
    const blobClient = containerClient.getBlobClient(params.path);
    const response = await blobClient.download();

    if (!response.readableStreamBody) {
      throw new NotFoundException(
        'Arquivo de export nao encontrado no storage.',
      );
    }

    return response.readableStreamBody as Readable;
  }

  private buildExpiresAt(): Date {
    const ttlHours = Number(
      this.config.get<string>('CAPTURE_EXPORT_FILE_TTL_HOURS', '168'),
    );
    const expiresAt = new Date();
    expiresAt.setHours(
      expiresAt.getHours() + (Number.isFinite(ttlHours) ? ttlHours : 168),
    );
    return expiresAt;
  }

  private shouldRequireSharedStorage(): boolean {
    const serviceBusEnabled =
      this.config.get<string>('SERVICE_BUS_ENABLED', 'false') === 'true';
    const allowLocal =
      this.config.get<string>('CAPTURE_EXPORT_ALLOW_LOCAL_STORAGE', 'false') ===
      'true';
    return serviceBusEnabled && !allowLocal;
  }
}
