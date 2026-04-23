import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VotingCampaign } from './voting-campaign.entity';
import { VotingCandidate } from './voting-candidate.entity';
import { VotingVoter } from './voting-voter.entity';

export enum VotingVoteStatus {
  VALID = 'VALID',
  INVALID = 'INVALID',
}

@Entity({ name: 'voting_vote' })
export class VotingVote {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => VotingCampaign, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign!: VotingCampaign;

  @ManyToOne(() => VotingCandidate, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'candidate_id' })
  candidate!: VotingCandidate;

  @ManyToOne(() => VotingVoter, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'voter_id' })
  voter!: VotingVoter;

  @Column({ type: 'text', name: 'status', default: VotingVoteStatus.VALID })
  status!: VotingVoteStatus;

  @Column({ type: 'text', name: 'ip_hash', nullable: true })
  ip_hash?: string;

  @Column({ type: 'text', name: 'user_agent', nullable: true })
  user_agent?: string;

  @Column({ type: 'jsonb', name: 'metadata', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;
}
