import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'marketing_ad_daily_performance' })
export class MarketingAdDailyPerformance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'text', name: 'provider' })
  provider!: string;

  @Index()
  @Column({ type: 'text', name: 'external_account_id' })
  external_account_id!: string;

  @Column({ type: 'text', name: 'account_name', nullable: true })
  account_name?: string;

  @Column({ type: 'text', name: 'external_campaign_id', nullable: true })
  external_campaign_id?: string;

  @Column({ type: 'text', name: 'campaign_name', nullable: true })
  campaign_name?: string;

  @Column({ type: 'text', name: 'external_adset_id', nullable: true })
  external_adset_id?: string;

  @Column({ type: 'text', name: 'adset_name', nullable: true })
  adset_name?: string;

  @Column({ type: 'text', name: 'external_ad_id' })
  external_ad_id!: string;

  @Column({ type: 'text', name: 'ad_name', nullable: true })
  ad_name?: string;

  @Index()
  @Column({ type: 'date', name: 'report_date' })
  report_date!: string;

  @Column({ type: 'bigint', name: 'impressions', default: '0' })
  impressions!: string;

  @Column({ type: 'bigint', name: 'clicks', default: '0' })
  clicks!: string;

  @Column({ type: 'numeric', name: 'spend', precision: 18, scale: 6, default: 0 })
  spend!: string;

  @Column({
    type: 'numeric',
    name: 'conversions',
    precision: 18,
    scale: 6,
    nullable: true,
  })
  conversions?: string;

  @Column({ type: 'jsonb', name: 'metadata', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
