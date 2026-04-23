import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VotingCampaign } from './voting-campaign.entity';
import { VotingCategory } from './voting-category.entity';

@Entity({ name: 'voting_candidate' })
@Index(['campaign', 'active', 'display_order'])
export class VotingCandidate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => VotingCampaign, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign!: VotingCampaign;

  @ManyToOne(() => VotingCategory, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category!: VotingCategory;

  @Column({ type: 'text', name: 'name' })
  name!: string;

  @Column({ type: 'text', name: 'story_text', nullable: true })
  story_text?: string;

  @Column({ type: 'text', name: 'photo_url' })
  photo_url!: string;

  @Column({ type: 'boolean', name: 'active', default: true })
  active!: boolean;

  @Column({ type: 'int', name: 'display_order', default: 0 })
  display_order!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
