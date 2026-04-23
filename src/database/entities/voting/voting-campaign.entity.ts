import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum VotingCampaignStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CLOSED = 'CLOSED',
}

@Entity({ name: 'voting_campaign' })
export class VotingCampaign {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'text', name: 'slug' })
  slug!: string;

  @Column({ type: 'text', name: 'name' })
  name!: string;

  @Column({ type: 'text', name: 'description', nullable: true })
  description?: string;

  @Column({ type: 'timestamptz', name: 'starts_at' })
  starts_at!: Date;

  @Column({ type: 'timestamptz', name: 'ends_at' })
  ends_at!: Date;

  @Column({ type: 'text', name: 'status', default: VotingCampaignStatus.DRAFT })
  status!: VotingCampaignStatus;

  @Column({ type: 'boolean', name: 'active', default: true })
  active!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
