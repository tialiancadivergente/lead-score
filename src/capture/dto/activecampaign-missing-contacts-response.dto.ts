import { ApiProperty } from '@nestjs/swagger';

export class ActiveCampaignMissingContactItemDto {
  @ApiProperty()
  capture_id!: string;

  @ApiProperty({ example: '2026-07-25T14:11:43.501Z' })
  created_at!: string;

  @ApiProperty({ example: '120246' })
  tag_id!: string;

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
}

export class ActiveCampaignMissingContactsMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 50 })
  per_page!: number;

  @ApiProperty({ example: 60 })
  total_items!: number;

  @ApiProperty({ example: 2 })
  total_pages!: number;
}

export class ActiveCampaignMissingContactsResponseDto {
  @ApiProperty({ example: '120246' })
  tag_id!: string;

  @ApiProperty({ nullable: true, example: '2026-07-01T00:00:00.000Z' })
  start_date!: string | null;

  @ApiProperty({ nullable: true, example: '2026-07-25T23:59:59.999Z' })
  end_date!: string | null;

  @ApiProperty({ type: ActiveCampaignMissingContactItemDto, isArray: true })
  items!: ActiveCampaignMissingContactItemDto[];

  @ApiProperty({ type: ActiveCampaignMissingContactsMetaDto })
  meta!: ActiveCampaignMissingContactsMetaDto;
}
