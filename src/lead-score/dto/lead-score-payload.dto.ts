import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LeadScoreAnswerDto {
  @ApiProperty({
    description: 'Question id.',
    example: 'b345f0ca-619e-4fc4-9ca8-a307f0d4c7fe',
  })
  @IsString()
  question_id!: string;

  @ApiPropertyOptional({
    description: 'Selected option id for single/multi questions.',
    example: '9be5f188-30dc-4d4f-a4df-df573f54cd55',
  })
  @IsOptional()
  @IsString()
  option_id?: string;

  @ApiPropertyOptional({
    description: 'Text answer.',
    example: 'Quero melhorar meus resultados e clareza.',
  })
  @IsOptional()
  @IsString()
  answer_text?: string;

  @ApiPropertyOptional({
    description: 'Numeric answer.',
    example: 4500,
  })
  @IsOptional()
  @IsNumber()
  answer_number?: number;

  @ApiPropertyOptional({
    description: 'Boolean answer.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  answer_bool?: boolean;

  @ApiPropertyOptional({
    description: 'Answer date/time.',
    example: '2026-02-12T14:30:00.000Z',
  })
  @IsOptional()
  @IsString()
  answered_at?: string;
}

export class LeadScorePayloadDto {
  @ApiPropertyOptional({
    description: 'Capture id already registered by lead-registration.',
    example: '4f578bc0-3e59-4c22-8e4a-88999e8abc42',
  })
  @IsOptional()
  @IsString()
  capture_id?: string;

  @ApiPropertyOptional({
    description:
      'requestId returned by lead-registration/start to locate the capture.',
    example: 'f761f107-d904-4ea4-8f3e-e37d03e3fdd9',
  })
  @IsOptional()
  @IsString()
  lead_registration_request_id?: string;

  @ApiProperty({
    description: 'Answered form version id.',
    example: '2f76bc57-57a2-41fd-9c2c-18a726dd4fe0',
  })
  @IsString()
  form_version_id!: string;

  @ApiPropertyOptional({
    description: 'Quiz submission date/time.',
    example: '2026-02-12T14:30:00.000Z',
  })
  @IsOptional()
  @IsString()
  submitted_at?: string;

  @ApiProperty({
    description: 'Quiz answers.',
    type: LeadScoreAnswerDto,
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LeadScoreAnswerDto)
  answers!: LeadScoreAnswerDto[];

  @ApiPropertyOptional({
    description: 'Additional raw payload for audit.',
    example: {
      source: 'frontend',
      step: 'quiz',
    },
  })
  @IsOptional()
  @IsObject()
  raw_payload?: Record<string, any>;
}
