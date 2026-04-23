import { ApiProperty } from '@nestjs/swagger';
import { VotingCampaignStatus } from '../../database/entities/voting/voting-campaign.entity';

export class AdminVotingCampaignResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  starts_at!: string;

  @ApiProperty()
  ends_at!: string;

  @ApiProperty({ enum: VotingCampaignStatus })
  status!: VotingCampaignStatus;

  @ApiProperty()
  active!: boolean;

  @ApiProperty()
  created_at!: string;

  @ApiProperty()
  updated_at!: string;
}

export class AdminVotingCampaignListItemDto extends AdminVotingCampaignResponseDto {
  @ApiProperty()
  category_count!: number;

  @ApiProperty()
  candidate_count!: number;

  @ApiProperty()
  vote_count!: number;
}
