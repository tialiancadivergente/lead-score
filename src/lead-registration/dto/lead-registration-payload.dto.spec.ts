import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { LeadRegistrationPayloadDto } from './lead-registration-payload.dto';
import { RequireLeadRegistrationFieldsPipe } from '../pipes/require-lead-registration-fields.pipe';

describe('Lead registration request validation', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const payload = {
    name: '',
    cpf: '',
    email: 'teste@example.com',
    telefone: '+5516999999999',
    launch: 'nad',
    season: 'out26',
    tag_id: '121363',
    page: 'nad.aliancadivergente.com.br',
    path: '/nad/v1-exaliados-trafego/',
    url: 'https://nad.aliancadivergente.com.br/nad/v1-exaliados-trafego-t/',
    utms: { utm_source: '' },
    metadados: {
      url: 'https://nad.aliancadivergente.com.br/nad/v1-exaliados-trafego/',
      temperature: 't',
    },
  };
  const transform = (body: object) =>
    pipe.transform(body, {
      type: 'body',
      metatype: LeadRegistrationPayloadDto,
    });

  it('accepts and preserves the landing page URL at the root and in metadata', async () => {
    const dto = await transform(payload);

    expect(
      new RequireLeadRegistrationFieldsPipe().transform(dto),
    ).toMatchObject(payload);
  });

  it('continues accepting clients that only send the URL in metadata', async () => {
    const { url: _url, ...withoutRootUrl } = payload;
    await expect(transform(withoutRootUrl)).resolves.toMatchObject({
      metadados: payload.metadados,
    });
  });

  it('rejects a non-string root URL', async () => {
    await expect(transform({ ...payload, url: {} })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('continues rejecting unrecognized root fields', async () => {
    await expect(
      transform({ ...payload, unexpected: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
