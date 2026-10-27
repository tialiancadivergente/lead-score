import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateCaptureExportJobDto } from './create-capture-export-job.dto';

describe('CreateCaptureExportJobDto', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const metadata = { type: 'body' as const, metatype: CreateCaptureExportJobDto };

  it.each(['csv', 'xlsx'])('accepts format %s with launch filters', async (format) => {
    const body = { format, launch_id: '0b2f5687-2cdf-4d95-81f9-7e97d6f0d6d2' };
    await expect(pipe.transform(body, metadata)).resolves.toEqual(body);
  });

  it.each([{}, { format: 'excel' }, { format: null }])(
    'rejects a missing or unsupported format: %j',
    async (body) => {
      await expect(pipe.transform(body, metadata)).rejects.toBeInstanceOf(BadRequestException);
    },
  );
});
