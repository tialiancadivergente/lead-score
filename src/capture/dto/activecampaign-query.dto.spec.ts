import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ActiveCampaignContactTagsQueryDto } from './activecampaign-contact-tags-query.dto';
import { ActiveCampaignGapQueryDto } from './activecampaign-gap-query.dto';
import { ActiveCampaignMissingContactsQueryDto } from './activecampaign-missing-contacts-query.dto';

describe.each([
  { dto: ActiveCampaignGapQueryDto, pagination: false },
  { dto: ActiveCampaignContactTagsQueryDto, pagination: true },
  { dto: ActiveCampaignMissingContactsQueryDto, pagination: true },
])('$dto.name query validation', ({ dto, pagination }) => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const query = {
    tag_id: '121394',
    start_date: '2026-11-15',
    end_date: '2026-11-16',
    ...(pagination ? { page: '1', per_page: '50' } : {}),
  };
  const transform = (value: object) =>
    pipe.transform(value, { type: 'query', metatype: dto });

  it('accepts and preserves the parameters from the reported requests', async () => {
    await expect(transform(query)).resolves.toMatchObject(query);
  });

  it('accepts a tag without optional filters', async () => {
    await expect(transform({ tag_id: '121394' })).resolves.toMatchObject({
      tag_id: '121394',
    });
  });

  it('accepts datetime boundaries', async () => {
    const datedQuery = {
      ...query,
      start_date: '2026-11-15T00:00:00-03:00',
      end_date: '2026-11-16T23:59:59.999-03:00',
    };
    await expect(transform(datedQuery)).resolves.toMatchObject(datedQuery);
  });

  it('requires a tag', async () => {
    await expect(transform({})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('continues rejecting unknown parameters', async () => {
    await expect(
      transform({ ...query, unexpected: 'value' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each(Object.keys(query))(
    'rejects repeated values for %s',
    async (field) => {
      await expect(
        transform({ ...query, [field]: ['first', 'second'] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );
});

describe('ActiveCampaign contact tag status validation', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const transform = (status: unknown) =>
    pipe.transform(
      { tag_id: '121394', status },
      { type: 'query', metatype: ActiveCampaignContactTagsQueryDto },
    );

  it.each([
    'success',
    'tag-not-found',
    'duplicate-tag',
    'missing-tag-id',
    'missing-contact-id',
    'skipped',
    ' SUCCESS ',
    '',
  ])(
    'preserves status %j for normalization and validation by the service',
    async (status) => {
      await expect(transform(status)).resolves.toMatchObject({ status });
    },
  );

  it('rejects repeated status values', async () => {
    await expect(transform(['success', 'skipped'])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
