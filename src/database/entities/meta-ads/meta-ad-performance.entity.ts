import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'meta_ad_performance' })
@Index(['external_account_id', 'report_date'])
@Index(['external_campaign_id', 'report_date'])
@Index(['external_adset_id', 'report_date'])
@Index(['report_date'])
export class MetaAdPerformance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

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

  @Column({ type: 'date', name: 'report_date' })
  report_date!: string;

  // 'total' when no breakdown, 'facebook'/'instagram'/'audience_network'/'messenger' with breakdown
  @Column({ type: 'text', name: 'publisher_platform', default: 'total' })
  publisher_platform!: string;

  // Volume
  @Column({ type: 'bigint', name: 'impressions', default: '0' })
  impressions!: string;

  @Column({ type: 'bigint', name: 'clicks', default: '0' })
  clicks!: string;

  @Column({ type: 'bigint', name: 'reach', nullable: true })
  reach?: string;

  @Column({ type: 'bigint', name: 'inline_link_clicks', nullable: true })
  inline_link_clicks?: string;

  // Cost
  @Column({
    type: 'numeric',
    name: 'spend',
    precision: 18,
    scale: 6,
    default: 0,
  })
  spend!: string;

  // Meta-computed metrics
  @Column({
    type: 'numeric',
    name: 'ctr',
    precision: 18,
    scale: 6,
    nullable: true,
  })
  ctr?: string;

  @Column({
    type: 'numeric',
    name: 'cpc',
    precision: 18,
    scale: 6,
    nullable: true,
  })
  cpc?: string;

  @Column({
    type: 'numeric',
    name: 'cpm',
    precision: 18,
    scale: 6,
    nullable: true,
  })
  cpm?: string;

  // Conversion actions (extracted from actions array)
  @Column({
    type: 'numeric',
    name: 'leads',
    precision: 18,
    scale: 6,
    default: 0,
  })
  leads!: string;

  @Column({ type: 'bigint', name: 'landing_page_views', default: '0' })
  landing_page_views!: string;

  @Column({ type: 'bigint', name: 'initiate_checkouts', default: '0' })
  initiate_checkouts!: string;

  @Column({ type: 'bigint', name: 'purchases', default: '0' })
  purchases!: string;

  // Video metrics
  @Column({ type: 'bigint', name: 'video_views', nullable: true })
  video_views?: string;

  @Column({ type: 'bigint', name: 'video_p25_watched', nullable: true })
  video_p25_watched?: string;

  @Column({ type: 'bigint', name: 'video_p50_watched', nullable: true })
  video_p50_watched?: string;

  @Column({ type: 'bigint', name: 'video_p75_watched', nullable: true })
  video_p75_watched?: string;

  @Column({ type: 'bigint', name: 'video_p100_watched', nullable: true })
  video_p100_watched?: string;

  @Column({ type: 'bigint', name: 'video_thruplay_watched', nullable: true })
  video_thruplay_watched?: string;

  @Column({
    type: 'numeric',
    name: 'video_avg_time_watched',
    precision: 18,
    scale: 6,
    nullable: true,
  })
  video_avg_time_watched?: string;

  @Column({ type: 'bigint', name: 'video_30s_watched', nullable: true })
  video_30s_watched?: string;

  @Column({
    type: 'bigint',
    name: 'video_continuous_2s_watched',
    nullable: true,
  })
  video_continuous_2s_watched?: string;

  // Derived metric: landing_page_views / inline_link_clicks
  @Column({
    type: 'numeric',
    name: 'connect_rate',
    precision: 18,
    scale: 6,
    nullable: true,
  })
  connect_rate?: string;

  @Column({ type: 'jsonb', name: 'metadata', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
