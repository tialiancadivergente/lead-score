import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LeadScoreQuestionOptionDto {
  @ApiProperty({
    description: 'ID da opção.',
    example: '81fb42e8-f942-4864-bc00-6e2e3beb9908',
  })
  option_id!: string;

  @ApiProperty({
    description: 'Chave da opção.',
    example: '25-35',
  })
  option_key!: string;

  @ApiPropertyOptional({
    description: 'Texto exibido da opção.',
    example: '25-35',
  })
  option_text?: string;

  @ApiPropertyOptional({
    description:
      'Valor da resposta quando a opcao possui pontuacao configurada.',
    example: '25-35',
  })
  answer_value?: string;

  @ApiPropertyOptional({
    description:
      'Pontuacao da opcao no lead score, quando houver configuracao.',
    example: 14.78,
  })
  points?: number;

  @ApiProperty({
    description: 'Ordem de exibição da opção.',
    example: 2,
  })
  display_order!: number;
}

export class LeadScoreQuestionDto {
  @ApiProperty({
    description: 'ID da pergunta.',
    example: 'c8a029aa-e5b7-4687-951c-d8defc67c27c',
  })
  question_id!: string;

  @ApiProperty({
    description: 'Chave da pergunta.',
    example: 'q1',
  })
  question_key!: string;

  @ApiPropertyOptional({
    description: 'Texto da pergunta.',
    example: 'Em qual faixa etária você se encaixa?',
  })
  question_text?: string;

  @ApiPropertyOptional({
    description: 'Tipo de entrada da pergunta.',
    example: 'single',
  })
  input_type?: string;

  @ApiProperty({
    description: 'Ordem de exibição da pergunta.',
    example: 1,
  })
  display_order!: number;

  @ApiProperty({
    description: 'Se a pergunta é obrigatória na versão do formulário.',
    example: true,
  })
  required!: boolean;

  @ApiProperty({
    description: 'Opções da pergunta.',
    type: LeadScoreQuestionOptionDto,
    isArray: true,
  })
  options!: LeadScoreQuestionOptionDto[];
}

export class GetLeadScoreQuestionsResponseDto {
  @ApiProperty({
    description: 'ID da versão do formulário.',
    example: '2f76bc57-57a2-41fd-9c2c-18a726dd4fe0',
  })
  form_version_id!: string;

  @ApiProperty({
    description: 'Perguntas com opções para renderização no front.',
    type: LeadScoreQuestionDto,
    isArray: true,
  })
  questions!: LeadScoreQuestionDto[];
}
