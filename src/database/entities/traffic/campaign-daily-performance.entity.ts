import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Platform } from '../marketing/platform.entity';
import { AdAccount } from './ad-account.entity';
import { Campaign } from './campaign.entity';

@Entity({ name: 'campaign_daily_performance' })
export class CampaignDailyPerformance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'date', name: 'day' })
  day!: string;

  @ManyToOne(() => Platform, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'platform_id' })
  platform?: Platform;

  @ManyToOne(() => AdAccount, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ad_account_id' })
  ad_account?: AdAccount;

  @ManyToOne(() => Campaign, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'campaign_id' })
  campaign?: Campaign;

  @Column({ type: 'jsonb', name: 'metrics', nullable: true })
  metrics?: any;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
