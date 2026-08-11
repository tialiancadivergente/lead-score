import { ApiProperty } from '@nestjs/swagger';

export class CaptureSyncQuestionItemDto {
  @ApiProperty({ example: 'q1' })
  question_key!: string;

  @ApiProperty({
    nullable: true,
    example: 'Em qual faixa etaria voce se encaixa?',
  })
  question_text!: string | null;
}

export class CaptureSyncQuestionsResponseDto {
  @ApiProperty({ type: CaptureSyncQuestionItemDto, isArray: true })
  questions!: CaptureSyncQuestionItemDto[];
}
