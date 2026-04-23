import { ApiProperty } from '@nestjs/swagger';

export class CaptureQuizAnswerItemDto {
  @ApiProperty()
  form_answer_id!: string;

  @ApiProperty()
  question_id!: string;

  @ApiProperty({ nullable: true })
  question_key!: string | null;

  @ApiProperty({ nullable: true })
  question_text!: string | null;

  @ApiProperty({ nullable: true })
  input_type!: string | null;

  @ApiProperty({ nullable: true })
  option_id!: string | null;

  @ApiProperty({ nullable: true })
  option_key!: string | null;

  @ApiProperty({ nullable: true })
  option_text!: string | null;

  @ApiProperty({ nullable: true })
  answer_text!: string | null;

  @ApiProperty({ nullable: true })
  answer_number!: number | null;

  @ApiProperty({ nullable: true })
  answer_bool!: boolean | null;

  @ApiProperty({ nullable: true })
  answered_at!: string | null;
}

export class CaptureQuizAnswersResponseDto {
  @ApiProperty()
  capture_id!: string;

  @ApiProperty()
  quiz_answered!: boolean;

  @ApiProperty({ nullable: true })
  score_total!: number | null;

  @ApiProperty({ nullable: true })
  faixa!: string | null;

  @ApiProperty({ nullable: true })
  form_version_id!: string | null;

  @ApiProperty({ nullable: true })
  form_response_id!: string | null;

  @ApiProperty({ nullable: true })
  submitted_at!: string | null;

  @ApiProperty({ type: CaptureQuizAnswerItemDto, isArray: true })
  answers!: CaptureQuizAnswerItemDto[];
}
