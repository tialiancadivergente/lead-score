import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import {
  LeadScoreAnswerDto,
  LeadScorePayloadDto,
} from '../dto/lead-score-payload.dto';

@Injectable()
export class RequireLeadScoreFieldsPipe implements PipeTransform<
  unknown,
  LeadScorePayloadDto
> {
  transform(value: unknown): LeadScorePayloadDto {
    if (!value || typeof value !== 'object') {
      throw new BadRequestException('Body inválido: esperado um objeto JSON.');
    }

    const v = value as Record<string, unknown>;

    const formVersionId =
      typeof v.form_version_id === 'string' ? v.form_version_id.trim() : '';
    if (!formVersionId) {
      throw new BadRequestException(
        'Campo obrigatório ausente/inválido: form_version_id.',
      );
    }

    const captureId =
      typeof v.capture_id === 'string' ? v.capture_id.trim() : '';
    const leadRegistrationRequestId =
      typeof v.lead_registration_request_id === 'string'
        ? v.lead_registration_request_id.trim()
        : '';

    if (!captureId && !leadRegistrationRequestId) {
      throw new BadRequestException(
        'Informe capture_id ou lead_registration_request_id.',
      );
    }

    if (!Array.isArray(v.answers) || v.answers.length === 0) {
      throw new BadRequestException(
        'Campo obrigatório ausente/inválido: answers (array não vazio).',
      );
    }

    v.answers.forEach((answer, idx) => {
      if (!answer || typeof answer !== 'object') {
        throw new BadRequestException(
          `answers[${idx}] inválido: esperado objeto.`,
        );
      }

      const a = answer as Record<string, unknown>;
      const questionId =
        typeof a.question_id === 'string' ? a.question_id.trim() : '';
      if (!questionId) {
        throw new BadRequestException(
          `Campo obrigatório ausente/inválido: answers[${idx}].question_id.`,
        );
      }

      const hasOptionId =
        typeof a.option_id === 'string' && a.option_id.trim().length > 0;
      const hasAnswerText =
        typeof a.answer_text === 'string' && a.answer_text.trim().length > 0;
      const hasAnswerNumber =
        typeof a.answer_number === 'number' && Number.isFinite(a.answer_number);
      const hasAnswerBool = typeof a.answer_bool === 'boolean';

      const answerKinds = [
        hasOptionId,
        hasAnswerText,
        hasAnswerNumber,
        hasAnswerBool,
      ].filter(Boolean).length;

      if (answerKinds !== 1) {
        throw new BadRequestException(
          `answers[${idx}] deve conter exatamente um valor de resposta entre option_id, answer_text, answer_number, answer_bool.`,
        );
      }
    });

    return {
      capture_id: captureId || undefined,
      lead_registration_request_id: leadRegistrationRequestId || undefined,
      form_version_id: formVersionId,
      submitted_at:
        typeof v.submitted_at === 'string' ? v.submitted_at : undefined,
      raw_payload:
        v.raw_payload && typeof v.raw_payload === 'object'
          ? (v.raw_payload as Record<string, any>)
          : undefined,
      answers: v.answers as LeadScoreAnswerDto[],
    };
  }
}
