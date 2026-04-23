import { ApiProperty } from '@nestjs/swagger';

export class VotingVoteRegisteredResponseDto {
  @ApiProperty()
  vote_id!: string;

  @ApiProperty()
  campaign_id!: string;

  @ApiProperty()
  candidate_id!: string;

  @ApiProperty()
  voter_id!: string;

  @ApiProperty()
  created_at!: string;
}
