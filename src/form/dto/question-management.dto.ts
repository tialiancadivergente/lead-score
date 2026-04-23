import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QuestionResponseDto {
  @ApiProperty({ example: 'c8a029aa-e5b7-4687-951c-d8defc67c27c' })
  id!: string;

  @ApiProperty({ example: '7405904f-64b9-4b2e-a067-a5fa246e1d55' })
  form_id!: string;

  @ApiProperty({ example: 'q1' })
  question_key!: string;

  @ApiPropertyOptional({ example: 'Em qual faixa etaria voce se encaixa?' })
  question_text?: string;

  @ApiPropertyOptional({ example: 'single' })
  input_type?: string;

  @ApiProperty({ example: '2026-04-01T00:00:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-04-01T00:10:00.000Z' })
  updated_at!: string;
}

export class CreateQuestionDto {
  @ApiProperty({ example: 'q1' })
  question_key!: string;

  @ApiPropertyOptional({ example: 'Em qual faixa etaria voce se encaixa?' })
  question_text?: string;

  @ApiPropertyOptional({ example: 'single' })
  input_type?: string;
}

export class UpdateQuestionDto {
  @ApiPropertyOptional({ example: 'q1' })
  question_key?: string;

  @ApiPropertyOptional({ example: 'Em qual faixa etaria voce se encaixa?' })
  question_text?: string;

  @ApiPropertyOptional({ example: 'single' })
  input_type?: string;
}

export class QuestionOptionResponseDto {
  @ApiProperty({ example: '81fb42e8-f942-4864-bc00-6e2e3beb9908' })
  id!: string;

  @ApiProperty({ example: 'c8a029aa-e5b7-4687-951c-d8defc67c27c' })
  question_id!: string;

  @ApiProperty({ example: '25-35' })
  option_key!: string;

  @ApiPropertyOptional({ example: '25-35 anos' })
  option_text?: string;

  @ApiProperty({ example: 1 })
  display_order!: number;

  @ApiProperty({ example: '2026-04-01T00:00:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-04-01T00:10:00.000Z' })
  updated_at!: string;
}

export class CreateQuestionOptionDto {
  @ApiProperty({ example: '25-35' })
  option_key!: string;

  @ApiPropertyOptional({ example: '25-35 anos' })
  option_text?: string;

  @ApiPropertyOptional({ example: 1 })
  display_order?: number;
}

export class UpdateQuestionOptionDto {
  @ApiPropertyOptional({ example: '25-35' })
  option_key?: string;

  @ApiPropertyOptional({ example: '25-35 anos' })
  option_text?: string;

  @ApiPropertyOptional({ example: 1 })
  display_order?: number;
}
