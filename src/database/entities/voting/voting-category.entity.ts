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

@Entity({ name: 'voting_category' })
@Index(['campaign', 'slug'], { unique: true })
export class VotingCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => VotingCampaign, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign!: VotingCampaign;

  @Column({ type: 'text', name: 'slug' })
  slug!: string;

  @Column({ type: 'text', name: 'name' })
  name!: string;

  @Column({ type: 'int', name: 'display_order', default: 0 })
  display_order!: number;

  @Column({ type: 'boolean', name: 'active', default: true })
  active!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
