import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LeadScoreAnswerDto {
  @ApiProperty({
    description: 'ID da pergunta.',
    example: 'b345f0ca-619e-4fc4-9ca8-a307f0d4c7fe',
  })
  question_id!: string;

  @ApiPropertyOptional({
    description: 'ID da opção selecionada (perguntas do tipo single/multi).',
    example: '9be5f188-30dc-4d4f-a4df-df573f54cd55',
  })
  option_id?: string;

  @ApiPropertyOptional({
    description: 'Resposta textual (perguntas do tipo text).',
    example: 'Quero melhorar meus resultados e clareza.',
  })
  answer_text?: string;

  @ApiPropertyOptional({
    description: 'Resposta numérica (perguntas do tipo number).',
    example: 4500,
  })
  answer_number?: number;

  @ApiPropertyOptional({
    description: 'Resposta booleana (perguntas do tipo bool).',
    example: true,
  })
  answer_bool?: boolean;

  @ApiPropertyOptional({
    description: 'Data/hora da resposta.',
    example: '2026-02-12T14:30:00.000Z',
  })
  answered_at?: string;
}

export class LeadScorePayloadDto {
  @ApiPropertyOptional({
    description: 'ID da capture já registrada no lead-registration.',
    example: '4f578bc0-3e59-4c22-8e4a-88999e8abc42',
  })
  capture_id?: string;

  @ApiPropertyOptional({
    description:
      'requestId retornado pelo lead-registration/start para localizar a capture.',
    example: 'f761f107-d904-4ea4-8f3e-e37d03e3fdd9',
  })
  lead_registration_request_id?: string;

  @ApiProperty({
    description: 'ID da versão do formulário respondido.',
    example: '2f76bc57-57a2-41fd-9c2c-18a726dd4fe0',
  })
  form_version_id!: string;

  @ApiPropertyOptional({
    description: 'Data/hora de envio do quiz.',
    example: '2026-02-12T14:30:00.000Z',
  })
  submitted_at?: string;

  @ApiProperty({
    description: 'Lista de respostas do quiz.',
    type: LeadScoreAnswerDto,
    isArray: true,
  })
  answers!: LeadScoreAnswerDto[];

  @ApiPropertyOptional({
    description: 'Payload bruto adicional para auditoria.',
    example: {
      source: 'frontend',
      step: 'quiz',
    },
  })
  raw_payload?: Record<string, any>;
}
