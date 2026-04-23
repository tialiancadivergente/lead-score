import { ApiProperty } from '@nestjs/swagger';

export class AdminVotingCandidateResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  campaign_id!: string;

  @ApiProperty()
  category_id!: string;

  @ApiProperty()
  category_slug!: string;

  @ApiProperty()
  category_name!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  story_text!: string | null;

  @ApiProperty()
  photo_url!: string;

  @ApiProperty()
  active!: boolean;

  @ApiProperty()
  display_order!: number;

  @ApiProperty()
  created_at!: string;

  @ApiProperty()
  updated_at!: string;
}
