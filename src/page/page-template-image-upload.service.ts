import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlobServiceClient } from '@azure/storage-blob';
import { randomUUID } from 'crypto';
import { extname } from 'path';

type SupportedImageType = {
  extension: string;
  contentType: string;
};

const ALLOWED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.avif',
  '.svg',
]);

@Injectable()
export class PageTemplateImageUploadService {
  private readonly containerName: string;
  private readonly maxBytes: number;
  private readonly blobClient: BlobServiceClient | null;
  private readonly servePrefix: string;

  constructor(private readonly config: ConfigService) {
    this.containerName = this.config.get<string>(
      'PAGE_TEMPLATE_IMAGE_BLOB_CONTAINER',
      'page-template-images',
    );
    this.maxBytes = Number(
      this.config.get<string>('PAGE_TEMPLATE_IMAGE_MAX_BYTES', '8388608'),
    );
    this.servePrefix = this.config.get<string>(
      'PAGE_TEMPLATE_IMAGE_SERVE_PREFIX',
      '/page/template-images',
    );

    const connectionString =
      this.config.get<string>('PAGE_TEMPLATE_IMAGE_BLOB_CONNECTION_STRING') ??
      this.config.get<string>('AZURE_STORAGE_CONNECTION_STRING') ??
      this.config.get<string>('CAPTURE_EXPORT_BLOB_CONNECTION_STRING');

    this.blobClient = connectionString
      ? BlobServiceClient.fromConnectionString(connectionString)
      : null;
  }

  async upload(file: {
    originalname?: string;
    mimetype?: string;
    size?: number;
    buffer?: Buffer;
  }) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Arquivo de imagem nao enviado.');
    }
    if (!this.blobClient) {
      throw new BadRequestException(
        'Storage de imagens de template nao configurado.',
      );
    }
    if (file.buffer.length > this.maxBytes) {
      throw new BadRequestException(
        `Arquivo excede o limite de ${this.maxBytes} bytes.`,
      );
    }

    const extension = extname(file.originalname ?? '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      throw new BadRequestException(
        'Extensao invalida. Use png, jpg, jpeg, webp, gif, avif ou svg.',
      );
    }

    const detected = this.detectImageType(file.buffer);
    if (!detected) {
      throw new BadRequestException('Conteudo do arquivo nao e imagem valida.');
    }
    this.assertExtensionMatchesType(extension, detected);

    const safeBuffer =
      detected.extension === 'svg'
        ? Buffer.from(this.sanitizeSvg(file.buffer.toString('utf8')), 'utf8')
        : file.buffer;

    const blobName = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${
      detected.extension
    }`;
    const containerClient = this.blobClient.getContainerClient(
      this.containerName,
    );
    await containerClient.createIfNotExists();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(safeBuffer, {
      blobHTTPHeaders: {
        blobContentType: detected.contentType,
      },
    });

    return {
      url: this.buildServeUrl(blobName),
      path: blobName,
      contentType: detected.contentType,
      size: safeBuffer.length,
      originalName: file.originalname ?? null,
    };
  }

  async download(path: string): Promise<{
    stream: NodeJS.ReadableStream;
    contentType: string;
    contentLength?: number;
  }> {
    if (!this.blobClient) {
      throw new BadRequestException(
        'Storage de imagens de template nao configurado.',
      );
    }

    const blobName = this.parseBlobPath(path);
    const containerClient = this.blobClient.getContainerClient(
      this.containerName,
    );
    const blobClient = containerClient.getBlobClient(blobName);
    const exists = await blobClient.exists();
    if (!exists) throw new NotFoundException('Imagem nao encontrada.');

    const response = await blobClient.download();
    if (!response.readableStreamBody) {
      throw new NotFoundException('Imagem nao encontrada.');
    }

    return {
      stream: response.readableStreamBody,
      contentType:
        response.contentType || this.contentTypeFromPath(blobName) || 'image/*',
      contentLength: response.contentLength,
    };
  }

  buildServeUrl(path: string): string {
    const prefix = this.servePrefix.replace(/\/$/, '');
    return `${prefix}/${this.parseBlobPath(path)}`;
  }

  private detectImageType(buffer: Buffer): SupportedImageType | null {
    if (buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) {
      return { extension: 'png', contentType: 'image/png' };
    }
    if (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    ) {
      return { extension: 'jpg', contentType: 'image/jpeg' };
    }
    if (
      buffer.subarray(0, 6).toString('ascii') === 'GIF87a' ||
      buffer.subarray(0, 6).toString('ascii') === 'GIF89a'
    ) {
      return { extension: 'gif', contentType: 'image/gif' };
    }
    if (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return { extension: 'webp', contentType: 'image/webp' };
    }
    if (
      buffer.length >= 12 &&
      buffer.subarray(4, 8).toString('ascii') === 'ftyp' &&
      ['avif', 'avis'].includes(buffer.subarray(8, 12).toString('ascii'))
    ) {
      return { extension: 'avif', contentType: 'image/avif' };
    }

    const text = buffer.subarray(0, 512).toString('utf8').trimStart();
    if (
      (text.startsWith('<svg') || text.startsWith('<?xml')) &&
      /<svg[\s>]/i.test(buffer.toString('utf8'))
    ) {
      return { extension: 'svg', contentType: 'image/svg+xml' };
    }

    return null;
  }

  private assertExtensionMatchesType(
    extension: string,
    detected: SupportedImageType,
  ): void {
    if (detected.extension === 'jpg') {
      if (extension === '.jpg' || extension === '.jpeg') return;
    }
    if (extension === `.${detected.extension}`) return;
    throw new BadRequestException('Extensao nao corresponde ao conteudo.');
  }

  private sanitizeSvg(svg: string): string {
    const blockedPattern =
      /<\s*(script|style|iframe|object|embed|form)\b|on[a-z]+\s*=|javascript:|srcset\s*=|formaction\s*=/i;
    if (blockedPattern.test(svg)) {
      throw new BadRequestException('SVG contem conteudo nao permitido.');
    }
    return svg;
  }

  private parseBlobPath(path: string): string {
    const decoded = decodeURIComponent(path).replace(/\\/g, '/');
    if (
      !/^\d{4}-\d{2}-\d{2}\/[0-9a-f-]+\.(png|jpg|jpeg|webp|gif|avif|svg)$/i.test(
        decoded,
      )
    ) {
      throw new BadRequestException('Caminho de imagem invalido.');
    }
    return decoded;
  }

  private contentTypeFromPath(path: string): string | null {
    const extension = extname(path).toLowerCase();
    if (extension === '.png') return 'image/png';
    if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
    if (extension === '.webp') return 'image/webp';
    if (extension === '.gif') return 'image/gif';
    if (extension === '.avif') return 'image/avif';
    if (extension === '.svg') return 'image/svg+xml';
    return null;
  }
}
