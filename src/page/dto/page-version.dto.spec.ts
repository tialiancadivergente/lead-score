import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePageVersionDto, UpdatePageVersionDto } from './page-version.dto';

const validateWithGlobalPipeOptions = (dto: object) =>
  validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

describe('PageVersion DTOs', () => {
  it('allows documented create fields with whitelist validation enabled', async () => {
    const dto = plainToInstance(CreatePageVersionDto, {
      template_image_url: '/leads-api/page/template-images/2026-09-23/image.webp',
      template_url: 'https://figma.com/file/example',
      active: true,
    });

    await expect(validateWithGlobalPipeOptions(dto)).resolves.toHaveLength(0);
  });

  it('allows documented update fields with whitelist validation enabled', async () => {
    const dto = plainToInstance(UpdatePageVersionDto, {
      active: true,
    });

    await expect(validateWithGlobalPipeOptions(dto)).resolves.toHaveLength(0);
  });

  it('rejects unknown fields with whitelist validation enabled', async () => {
    const dto = plainToInstance(UpdatePageVersionDto, {
      unknown_field: 'nope',
    });

    const errors = await validateWithGlobalPipeOptions(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('unknown_field');
  });
});
