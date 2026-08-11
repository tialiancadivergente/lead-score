import { ApiProperty } from '@nestjs/swagger';

export class ActiveCampaignContactTagSummaryItemDto {
  @ApiProperty({ example: 'tag-not-found' })
  status!: string;

  @ApiProperty({ example: 1502 })
  total!: number;
}

export class ActiveCampaignContactTagItemDto {
  @ApiProperty()
  capture_id!: string;

  @ApiProperty({ example: '2026-07-30T14:36:33.139Z' })
  created_at!: string;

  @ApiProperty({ example: '885678' })
  tag_id!: string;

  @ApiProperty({ example: 'tag-not-found' })
  status!: string;

  @ApiProperty({ nullable: true, example: 'tag-not-found' })
  reason!: string | null;

  @ApiProperty({ nullable: true })
  activecampaign_contact_id!: string | null;

  @ApiProperty({ nullable: true })
  email!: string | null;

  @ApiProperty({ nullable: true })
  phone!: string | null;

  @ApiProperty({ nullable: true })
  name!: string | null;

  @ApiProperty({ nullable: true })
  page!: string | null;

  @ApiProperty({ nullable: true })
  path!: string | null;

  @ApiProperty({ nullable: true, type: Object })
  contact_tag!: Record<string, any> | null;
}

export class ActiveCampaignContactTagsMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 50 })
  per_page!: number;

  @ApiProperty({ example: 1502 })
  total_items!: number;

  @ApiProperty({ example: 31 })
  total_pages!: number;
}

export class ActiveCampaignContactTagsResponseDto {
  @ApiProperty({ example: '885678' })
  tag_id!: string;

  @ApiProperty({ nullable: true, example: '2026-07-01T00:00:00.000Z' })
  start_date!: string | null;

  @ApiProperty({ nullable: true, example: '2026-07-30T23:59:59.999Z' })
  end_date!: string | null;

  @ApiProperty({ nullable: true, example: 'tag-not-found' })
  status!: string | null;

  @ApiProperty({
    type: ActiveCampaignContactTagSummaryItemDto,
    isArray: true,
  })
  summary!: ActiveCampaignContactTagSummaryItemDto[];

  @ApiProperty({ type: ActiveCampaignContactTagItemDto, isArray: true })
  items!: ActiveCampaignContactTagItemDto[];

  @ApiProperty({ type: ActiveCampaignContactTagsMetaDto })
  meta!: ActiveCampaignContactTagsMetaDto;
}
