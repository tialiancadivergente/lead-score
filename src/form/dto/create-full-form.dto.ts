import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FormResponseDto } from './form-response.dto';
import { FormVersionResponseDto } from './form-version-management.dto';
import { LeadscoreResponseDto } from './score-management.dto';

export class CreateFullFormOptionDto {
  @ApiProperty({ example: '25-35' })
  option_key!: string;

  @ApiPropertyOptional({ example: '25-35 anos' })
  option_text?: string;

  @ApiPropertyOptional({ example: 1 })
  display_order?: number;
}

export class CreateFullFormQuestionDto {
  @ApiProperty({ example: 'q1' })
  question_key!: string;

  @ApiPropertyOptional({ example: 'Em qual faixa etaria voce se encaixa?' })
  question_text?: string;

  @ApiPropertyOptional({ example: 'single' })
  input_type?: string;

  @ApiPropertyOptional({ example: 1 })
  display_order?: number;

  @ApiPropertyOptional({ example: true })
  required?: boolean;

  @ApiProperty({ type: CreateFullFormOptionDto, isArray: true })
  options!: CreateFullFormOptionDto[];
}

export class CreateFullFormScoreOptionPointDto {
  @ApiProperty({ example: 'q1' })
  question_key!: string;

  @ApiProperty({ example: '25-35' })
  option_key!: string;

  @ApiProperty({ example: 14.78 })
  points!: number;
}

export class CreateFullFormScoreRangePointDto {
  @ApiProperty({ example: 'q2' })
  question_key!: string;

  @ApiPropertyOptional({ nullable: true, example: 0 })
  min_value?: number;

  @ApiPropertyOptional({ nullable: true, example: 100000 })
  max_value?: number;

  @ApiProperty({ example: 10.2 })
  points!: number;
}

export class CreateFullFormScoreDto {
  @ApiProperty({ example: 'Leadscore principal' })
  name!: string;

  @ApiPropertyOptional({ example: true })
  active?: boolean;

  @ApiPropertyOptional({
    type: CreateFullFormScoreOptionPointDto,
    isArray: true,
  })
  option_points?: CreateFullFormScoreOptionPointDto[];

  @ApiPropertyOptional({
    type: CreateFullFormScoreRangePointDto,
    isArray: true,
  })
  range_points?: CreateFullFormScoreRangePointDto[];
}

export class CreateFullFormPayloadDto {
  @ApiProperty({ example: 'Formulario completo' })
  name!: string;

  @ApiPropertyOptional({ example: 'quiz' })
  type?: string;

  @ApiPropertyOptional({ example: '4c88a392-6e6f-417e-822a-5be7221900fd' })
  launch_id?: string;

  @ApiPropertyOptional({ example: 'b2aee9b9-bb96-4cd7-b7e4-5fde7ac352de' })
  season_id?: string;

  @ApiPropertyOptional({ example: 1 })
  version_number?: number;

  @ApiPropertyOptional({ example: true })
  version_active?: boolean;

  @ApiProperty({
    type: CreateFullFormQuestionDto,
    isArray: true,
  })
  questions!: CreateFullFormQuestionDto[];

  @ApiPropertyOptional({
    type: CreateFullFormScoreDto,
    isArray: true,
  })
  scores?: CreateFullFormScoreDto[];
}

export class CreateFullFormResponseDto {
  @ApiProperty({ type: FormResponseDto })
  form!: FormResponseDto;

  @ApiProperty({ type: FormVersionResponseDto })
  version!: FormVersionResponseDto;

  @ApiProperty({
    description: 'Quantidade de perguntas criadas.',
    example: 8,
  })
  questions_count!: number;

  @ApiProperty({
    description: 'Quantidade de opcoes criadas.',
    example: 24,
  })
  options_count!: number;

  @ApiProperty({
    type: LeadscoreResponseDto,
    isArray: true,
  })
  scores!: LeadscoreResponseDto[];
}
