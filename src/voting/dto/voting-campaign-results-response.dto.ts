import { ApiProperty } from '@nestjs/swagger';

export class VotingCampaignResultItemDto {
  @ApiProperty()
  candidate_id!: string;

  @ApiProperty()
  candidate_name!: string;

  @ApiProperty()
  candidate_photo_url!: string;

  @ApiProperty({ nullable: true })
  candidate_story_text!: string | null;

  @ApiProperty()
  category_id!: string;

  @ApiProperty()
  category_name!: string;

  @ApiProperty()
  vote_count!: number;
}

export class VotingCampaignResultsResponseDto {
  @ApiProperty()
  campaign_id!: string;

  @ApiProperty()
  total_votes!: number;

  @ApiProperty({ type: VotingCampaignResultItemDto, isArray: true })
  items!: VotingCampaignResultItemDto[];
}
