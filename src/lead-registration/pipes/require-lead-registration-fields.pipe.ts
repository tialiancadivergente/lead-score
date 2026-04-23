import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { LeadRegistrationPayloadDto } from '../dto/lead-registration-payload.dto';

@Injectable()
export class RequireLeadRegistrationFieldsPipe implements PipeTransform<
  unknown,
  LeadRegistrationPayloadDto
> {
  transform(value: unknown): LeadRegistrationPayloadDto {
    if (!value || typeof value !== 'object') {
      throw new BadRequestException('Body inválido: esperado um objeto JSON.');
    }

    const v = value as Record<string, unknown>;
    const required = [
      'email',
      'telefone',
      'launch',
      'season',
      'tag_id',
    ] as const;

    const missing = required.filter((k) => {
      const raw = v[k];
      return typeof raw !== 'string' || raw.trim().length === 0;
    });

    if (missing.length) {
      throw new BadRequestException(
        `Campos obrigatórios ausentes/invalidos: ${missing.join(', ')}.`,
      );
    }

    return value as LeadRegistrationPayloadDto;
  }
}
