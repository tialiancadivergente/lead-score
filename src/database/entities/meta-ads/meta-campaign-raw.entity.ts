import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'meta_campaigns_raw' })
@Index(['external_account_id'])
export class MetaCampaignRaw {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', name: 'external_account_id' })
  external_account_id!: string;

  @Column({ type: 'text', name: 'external_campaign_id' })
  external_campaign_id!: string;

  @Column({ type: 'text', name: 'campaign_name', nullable: true })
  campaign_name?: string;

  @Column({ type: 'text', name: 'status', nullable: true })
  status?: string;

  @Column({ type: 'text', name: 'effective_status', nullable: true })
  effective_status?: string;

  @Column({ type: 'text', name: 'objective', nullable: true })
  objective?: string;

  @Column({ type: 'jsonb', name: 'payload' })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz', name: 'fetched_at' })
  fetched_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
