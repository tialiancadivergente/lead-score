import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MarketingExtractJob } from './marketing-extract-job.entity';

@Entity({ name: 'marketing_extract_raw' })
export class MarketingExtractRaw {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => MarketingExtractJob, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job!: MarketingExtractJob;

  @Index()
  @Column({ type: 'text', name: 'provider' })
  provider!: string;

  @Column({ type: 'text', name: 'external_account_id' })
  external_account_id!: string;

  @Column({ type: 'date', name: 'report_date' })
  report_date!: string;

  @Column({ type: 'jsonb', name: 'payload' })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;
}
