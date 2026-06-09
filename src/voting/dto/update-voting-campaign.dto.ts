import { ApiPropertyOptional } from '@nestjs/swagger';
import { VotingCampaignStatus } from '../../database/entities/voting/voting-campaign.entity';

export class UpdateVotingCampaignDto {
  @ApiPropertyOptional({ example: 'premio-2026' })
  slug?: string;

  @ApiPropertyOptional({ example: 'Premio Historias 2026' })
  name?: string;

  @ApiPropertyOptional({ example: 'Votacao principal de 2026' })
  description?: string;

  @ApiPropertyOptional({ example: '2026-04-01T00:00:00.000Z' })
  starts_at?: string;

  @ApiPropertyOptional({ example: '2026-04-30T23:59:59.999Z' })
  ends_at?: string;

  @ApiPropertyOptional({
    enum: VotingCampaignStatus,
    example: VotingCampaignStatus.PUBLISHED,
  })
  status?: VotingCampaignStatus;

  @ApiPropertyOptional({ example: true })
  active?: boolean;
}
