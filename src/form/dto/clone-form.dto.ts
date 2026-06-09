import { ApiProperty } from '@nestjs/swagger';
import { FormVersionResponseDto } from './form-version-management.dto';

export class CloneFormPayloadDto {
  @ApiProperty({ example: '7405904f-64b9-4b2e-a067-a5fa246e1d55' })
  source_form_id!: string;

  @ApiProperty({ example: '2f76bc57-57a2-41fd-9c2c-18a726dd4fe0' })
  source_form_version_id!: string;

  @ApiProperty({ example: '658cbd7e-7779-421a-8082-2db5ef4d5e55' })
  target_form_id!: string;

  @ApiProperty({ example: '9a75c470-f7d6-4ae5-ad92-e74add87b274' })
  target_form_version_id!: string;
}

export class CloneFormResponseDto {
  @ApiProperty({ example: '7405904f-64b9-4b2e-a067-a5fa246e1d55' })
  source_form_id!: string;

  @ApiProperty({ example: '2f76bc57-57a2-41fd-9c2c-18a726dd4fe0' })
  source_form_version_id!: string;

  @ApiProperty({ example: '658cbd7e-7779-421a-8082-2db5ef4d5e55' })
  target_form_id!: string;

  @ApiProperty({ example: '9a75c470-f7d6-4ae5-ad92-e74add87b274' })
  requested_target_form_version_id!: string;

  @ApiProperty({ example: 'd3d0f0f1-c5b9-4c34-b10e-fbb32d59a1aa' })
  target_form_version_id!: string;

  @ApiProperty({ example: true })
  created_new_version!: boolean;

  @ApiProperty({ type: FormVersionResponseDto })
  target_version!: FormVersionResponseDto;

  @ApiProperty({ example: 12 })
  questions_count!: number;

  @ApiProperty({ example: 12 })
  question_links_count!: number;

  @ApiProperty({ example: 48 })
  options_count!: number;

  @ApiProperty({ example: 1 })
  scores_count!: number;

  @ApiProperty({ example: 48 })
  option_points_count!: number;

  @ApiProperty({ example: 0 })
  range_points_count!: number;

  @ApiProperty({ example: 5 })
  tier_rules_count!: number;
}
