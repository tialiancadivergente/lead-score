import { ApiProperty } from '@nestjs/swagger';
import { VotingCampaignStatus } from '../../database/entities/voting/voting-campaign.entity';

export class PublicVotingCampaignCategoryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  display_order!: number;

  @ApiProperty()
  candidate_count!: number;
}

export class PublicVotingCampaignResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: VotingCampaignStatus })
  status!: VotingCampaignStatus;

  @ApiProperty()
  starts_at!: string;

  @ApiProperty()
  ends_at!: string;

  @ApiProperty()
  total_candidates!: number;

  @ApiProperty({ type: PublicVotingCampaignCategoryDto, isArray: true })
  categories!: PublicVotingCampaignCategoryDto[];
}
