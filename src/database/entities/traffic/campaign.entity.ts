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

@Entity({ name: 'campaign' })
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Platform, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'platform_id' })
  platform?: Platform;

  @ManyToOne(() => AdAccount, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ad_account_id' })
  ad_account?: AdAccount;

  @Column({ type: 'text', name: 'name' })
  name!: string;

  @Column({ type: 'jsonb', name: 'external_ids', nullable: true })
  external_ids?: any;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
