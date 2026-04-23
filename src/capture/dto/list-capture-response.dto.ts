import { ApiProperty } from '@nestjs/swagger';

export class CaptureListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  page!: string | null;

  @ApiProperty({ nullable: true })
  path!: string | null;

  @ApiProperty({ nullable: true })
  utm_source!: string | null;

  @ApiProperty({ nullable: true })
  utm_medium!: string | null;

  @ApiProperty({ nullable: true })
  utm_campaign!: string | null;

  @ApiProperty({ nullable: true })
  utm_content!: string | null;

  @ApiProperty({ nullable: true })
  utm_term!: string | null;

  @ApiProperty({ nullable: true })
  utm_id!: string | null;

  @ApiProperty({
    description: 'Data de criacao do registro.',
    example: '2026-03-14T15:08:40.273Z',
  })
  created_at!: string;

  @ApiProperty({
    description: 'Indica se o lead já respondeu o quiz.',
    example: true,
  })
  quiz_answered!: boolean;

  @ApiProperty({ nullable: true })
  score_total!: number | null;

  @ApiProperty({ nullable: true })
  faixa!: string | null;

  @ApiProperty({ nullable: true })
  quiz_answers!: string | null;

  @ApiProperty({ nullable: true })
  person_id!: string | null;

  @ApiProperty({ nullable: true })
  name!: string | null;

  @ApiProperty({ nullable: true })
  person_email!: string | null;

  @ApiProperty({ nullable: true })
  person_phone!: string | null;

  @ApiProperty({ nullable: true })
  platform_id!: string | null;

  @ApiProperty({ nullable: true })
  platform_name!: string | null;

  @ApiProperty({ nullable: true })
  strategy_id!: string | null;

  @ApiProperty({ nullable: true })
  strategy_name!: string | null;

  @ApiProperty({ nullable: true })
  temperature_id!: string | null;

  @ApiProperty({ nullable: true })
  temperature_name!: string | null;

  @ApiProperty({ nullable: true })
  launch_id!: string | null;

  @ApiProperty({ nullable: true })
  launch_name!: string | null;

  @ApiProperty({ nullable: true })
  season_id!: string | null;

  @ApiProperty({ nullable: true })
  season_name!: string | null;

  @ApiProperty()
  tag_id!: string;

  @ApiProperty({ nullable: true })
  tag_name!: string | null;

  @ApiProperty({ nullable: true })
  ad_id!: string | null;

  @ApiProperty({ nullable: true })
  ad_name!: string | null;

  @ApiProperty({ nullable: true })
  external_ad_id!: string | null;

  @ApiProperty({ nullable: true })
  external_ad_name!: string | null;
}

export class CaptureListMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 50 })
  per_page!: number;

  @ApiProperty({ example: 321 })
  total_items!: number;

  @ApiProperty({ example: 7 })
  total_pages!: number;
}

export class CaptureListResponseDto {
  @ApiProperty({ type: CaptureListItemDto, isArray: true })
  items!: CaptureListItemDto[];

  @ApiProperty({ type: CaptureListMetaDto })
  meta!: CaptureListMetaDto;
}
