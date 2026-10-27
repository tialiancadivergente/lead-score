import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { toNumber } from './number-transform';

export class FormVersionResponseDto {
  @ApiProperty({ example: '2f76bc57-57a2-41fd-9c2c-18a726dd4fe0' })
  id!: string;

  @ApiProperty({ example: '7405904f-64b9-4b2e-a067-a5fa246e1d55' })
  form_id!: string;

  @ApiProperty({ example: 1 })
  version_number!: number;

  @ApiProperty({ example: true })
  active!: boolean;

  @ApiProperty({ example: '2026-04-01T00:00:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-04-01T00:10:00.000Z' })
  updated_at!: string;
}

export class CreateFormVersionDto {
  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(toNumber)
  version_number?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateFormVersionDto {
  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(toNumber)
  version_number?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class FormVersionQuestionResponseDto {
  @ApiProperty({ example: '2f76bc57-57a2-41fd-9c2c-18a726dd4fe0' })
  form_version_id!: string;

  @ApiProperty({ example: 'c8a029aa-e5b7-4687-951c-d8defc67c27c' })
  question_id!: string;

  @ApiProperty({ example: 1 })
  display_order!: number;

  @ApiProperty({ example: true })
  required!: boolean;

  @ApiProperty({ example: 'q1' })
  question_key!: string;

  @ApiPropertyOptional({ example: 'Em qual faixa etaria voce se encaixa?' })
  question_text?: string;

  @ApiPropertyOptional({ example: 'single' })
  input_type?: string;
}

export class AddFormVersionQuestionDto {
  @ApiProperty({ example: 'c8a029aa-e5b7-4687-951c-d8defc67c27c' })
  @IsUUID()
  question_id!: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  display_order?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

export class UpdateFormVersionQuestionDto {
  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  display_order?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

export class ReorderFormVersionQuestionItemDto {
  @ApiProperty({ example: 'c8a029aa-e5b7-4687-951c-d8defc67c27c' })
  @IsUUID()
  question_id!: string;

  @ApiProperty({ example: 1 })
  @Transform(toNumber)
  @IsInt()
  display_order!: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

export class ReorderFormVersionQuestionsDto {
  @ApiProperty({
    type: ReorderFormVersionQuestionItemDto,
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderFormVersionQuestionItemDto)
  items!: ReorderFormVersionQuestionItemDto[];
}
