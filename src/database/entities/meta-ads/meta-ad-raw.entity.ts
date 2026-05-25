import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'meta_ads_raw' })
@Index(['external_account_id'])
@Index(['external_campaign_id'])
@Index(['external_adset_id'])
export class MetaAdRaw {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', name: 'external_account_id' })
  external_account_id!: string;

  @Column({ type: 'text', name: 'external_ad_id' })
  external_ad_id!: string;

  @Column({ type: 'text', name: 'external_adset_id', nullable: true })
  external_adset_id?: string;

  @Column({ type: 'text', name: 'external_campaign_id', nullable: true })
  external_campaign_id?: string;

  @Column({ type: 'text', name: 'ad_name', nullable: true })
  ad_name?: string;

  @Column({ type: 'text', name: 'status', nullable: true })
  status?: string;

  @Column({ type: 'text', name: 'effective_status', nullable: true })
  effective_status?: string;

  @Column({ type: 'text', name: 'thumbnail_url', nullable: true })
  thumbnail_url?: string;

  @Column({ type: 'jsonb', name: 'payload' })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz', name: 'fetched_at' })
  fetched_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
