import { ApiProperty } from '@nestjs/swagger';

export class AdminVotingCategoryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  campaign_id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  display_order!: number;

  @ApiProperty()
  active!: boolean;

  @ApiProperty()
  created_at!: string;

  @ApiProperty()
  updated_at!: string;
}
