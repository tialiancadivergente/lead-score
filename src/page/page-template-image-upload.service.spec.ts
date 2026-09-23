import { BadRequestException } from '@nestjs/common';
import { PageTemplateImageUploadService } from './page-template-image-upload.service';

describe('PageTemplateImageUploadService', () => {
  const config = {
    get: jest.fn((key: string, fallback?: string) => {
      if (key === 'PAGE_TEMPLATE_IMAGE_MAX_BYTES') return '8388608';
      return fallback;
    }),
  };

  it('rejects files without a valid image magic signature', async () => {
    const service = new PageTemplateImageUploadService(config as never);

    await expect(
      service.upload({
        originalname: 'image.png',
        buffer: Buffer.from('not-image'),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects SVG with script content', async () => {
    const service = new PageTemplateImageUploadService(config as never);

    await expect(
      service.upload({
        originalname: 'image.svg',
        buffer: Buffer.from('<svg><script>alert(1)</script></svg>'),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('builds authenticated backend image URLs', () => {
    const service = new PageTemplateImageUploadService({
      get: jest.fn((key: string, fallback?: string) => {
        if (key === 'PAGE_TEMPLATE_IMAGE_SERVE_PREFIX') {
          return '/leads-api/page/template-images';
        }
        return fallback;
      }),
    } as never);

    expect(
      service.buildServeUrl(
        '2026-09-23/4a2e8fa2-7256-4fe6-b680-8fe44a3bc969.png',
      ),
    ).toBe(
      '/leads-api/page/template-images/2026-09-23/4a2e8fa2-7256-4fe6-b680-8fe44a3bc969.png',
    );
  });

  it('rejects invalid template image paths', async () => {
    const service = new PageTemplateImageUploadService(config as never);

    await expect(service.download('../secret.txt')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
