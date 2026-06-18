import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { AuthModule } from '../auth/auth.module';
import { VotingCampaign } from '../database/entities/voting/voting-campaign.entity';
import { VotingCandidate } from '../database/entities/voting/voting-candidate.entity';
import { VotingCategory } from '../database/entities/voting/voting-category.entity';
import { VotingVote } from '../database/entities/voting/voting-vote.entity';
import { VotingVoter } from '../database/entities/voting/voting-voter.entity';
import { VotingAdminController } from './voting-admin.controller';
import { VotingPublicController } from './voting-public.controller';
import { VotingService } from './voting.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      VotingCampaign,
      VotingCategory,
      VotingCandidate,
      VotingVoter,
      VotingVote,
    ]),
  ],
  controllers: [VotingPublicController, VotingAdminController],
  providers: [VotingService, ApiKeyGuard],
})
export class VotingModule {}
