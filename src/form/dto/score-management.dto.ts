import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LeadscoreResponseDto {
  @ApiProperty({ example: 'f94c3f1d-c1f9-4e80-9ab9-aea933d4f233' })
  id!: string;

  @ApiProperty({ example: '2f76bc57-57a2-41fd-9c2c-18a726dd4fe0' })
  form_version_id!: string;

  @ApiProperty({ example: 'Leadscore principal' })
  name!: string;

  @ApiProperty({ example: true })
  active!: boolean;

  @ApiProperty({ example: '2026-04-01T00:00:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-04-01T00:10:00.000Z' })
  updated_at!: string;
}

export class CreateLeadscoreDto {
  @ApiProperty({ example: 'Leadscore principal' })
  name!: string;

  @ApiPropertyOptional({ example: true })
  active?: boolean;
}

export class UpdateLeadscoreDto {
  @ApiPropertyOptional({ example: 'Leadscore v2' })
  name?: string;

  @ApiPropertyOptional({ example: false })
  active?: boolean;
}

export class LeadscoreOptionPointResponseDto {
  @ApiProperty({ example: 'f94c3f1d-c1f9-4e80-9ab9-aea933d4f233' })
  leadscore_id!: string;

  @ApiProperty({ example: 'c8a029aa-e5b7-4687-951c-d8defc67c27c' })
  question_id!: string;

  @ApiProperty({ example: '81fb42e8-f942-4864-bc00-6e2e3beb9908' })
  option_id!: string;

  @ApiProperty({ example: 'q1' })
  question_key!: string;

  @ApiProperty({ example: '25-35' })
  option_key!: string;

  @ApiProperty({ example: 14.78 })
  points!: number;
}

export class UpsertLeadscoreOptionPointItemDto {
  @ApiProperty({ example: 'c8a029aa-e5b7-4687-951c-d8defc67c27c' })
  question_id!: string;

  @ApiProperty({ example: '81fb42e8-f942-4864-bc00-6e2e3beb9908' })
  option_id!: string;

  @ApiProperty({ example: 14.78 })
  points!: number;
}

export class ReplaceLeadscoreOptionPointsDto {
  @ApiProperty({
    type: UpsertLeadscoreOptionPointItemDto,
    isArray: true,
  })
  items!: UpsertLeadscoreOptionPointItemDto[];
}

export class LeadscoreRangePointResponseDto {
  @ApiProperty({ example: 'f94c3f1d-c1f9-4e80-9ab9-aea933d4f233' })
  leadscore_id!: string;

  @ApiProperty({ example: 'c8a029aa-e5b7-4687-951c-d8defc67c27c' })
  question_id!: string;

  @ApiProperty({ example: 'q1' })
  question_key!: string;

  @ApiPropertyOptional({ nullable: true, example: 18 })
  min_value?: number | null;

  @ApiPropertyOptional({ nullable: true, example: 25 })
  max_value?: number | null;

  @ApiProperty({ example: 9.4 })
  points!: number;
}

export class UpsertLeadscoreRangePointItemDto {
  @ApiProperty({ example: 'c8a029aa-e5b7-4687-951c-d8defc67c27c' })
  question_id!: string;

  @ApiPropertyOptional({ nullable: true, example: 18 })
  min_value?: number;

  @ApiPropertyOptional({ nullable: true, example: 25 })
  max_value?: number;

  @ApiProperty({ example: 9.4 })
  points!: number;
}

export class ReplaceLeadscoreRangePointsDto {
  @ApiProperty({
    type: UpsertLeadscoreRangePointItemDto,
    isArray: true,
  })
  items!: UpsertLeadscoreRangePointItemDto[];
}

export class LeadscoreTierResponseDto {
  @ApiProperty({ example: '81fb42e8-f942-4864-bc00-6e2e3beb9908' })
  id!: string;

  @ApiProperty({ example: 'A+' })
  code!: string;

  @ApiProperty({ example: 'A+' })
  name!: string;
}

export class CreateLeadscoreTierDto {
  @ApiProperty({ example: 'A+' })
  code!: string;

  @ApiProperty({ example: 'A+' })
  name!: string;
}

export class UpdateLeadscoreTierDto {
  @ApiPropertyOptional({ example: 'A+' })
  code?: string;

  @ApiPropertyOptional({ example: 'A Plus' })
  name?: string;
}

export class LeadscoreTierRuleResponseDto {
  @ApiProperty({ example: 'f94c3f1d-c1f9-4e80-9ab9-aea933d4f233' })
  id!: string;

  @ApiProperty({ example: 'f94c3f1d-c1f9-4e80-9ab9-aea933d4f233' })
  leadscore_id!: string;

  @ApiProperty({ example: '81fb42e8-f942-4864-bc00-6e2e3beb9908' })
  tier_id!: string;

  @ApiProperty({ example: 'A' })
  tier_code!: string;

  @ApiProperty({ example: 'A' })
  tier_name!: string;

  @ApiPropertyOptional({ nullable: true, example: 180.3 })
  min_score?: number | null;

  @ApiPropertyOptional({ nullable: true, example: null })
  max_score?: number | null;
}

export class UpsertLeadscoreTierRuleItemDto {
  @ApiProperty({ example: '81fb42e8-f942-4864-bc00-6e2e3beb9908' })
  tier_id!: string;

  @ApiPropertyOptional({ nullable: true, example: 180.3 })
  min_score?: number;

  @ApiPropertyOptional({ nullable: true, example: null })
  max_score?: number;
}

export class ReplaceLeadscoreTierRulesDto {
  @ApiProperty({
    type: UpsertLeadscoreTierRuleItemDto,
    isArray: true,
  })
  items!: UpsertLeadscoreTierRuleItemDto[];
}
