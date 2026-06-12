import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// 'insights' | 'campaigns' | 'adsets' | 'ads' | 'full' | 'insights_bulk'
export type MetaSyncStep =
  | 'insights'
  | 'campaigns'
  | 'adsets'
  | 'ads'
  | 'full'
  | 'insights_bulk';

@Entity({ name: 'meta_sync_schedule' })
export class MetaSyncSchedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', nullable: true })
  name?: string;

  @Column({ type: 'text', name: 'sync_step', default: 'insights_bulk' })
  sync_step!: MetaSyncStep;

  // 'last_7d' | 'last_30d' | 'last_90d' | 'custom'
  @Column({ type: 'text', name: 'period_preset', default: 'last_30d' })
  period_preset!: string;

  @Column({ type: 'text', name: 'date_from', nullable: true })
  date_from?: string;

  @Column({ type: 'text', name: 'date_to', nullable: true })
  date_to?: string;

  // 'ad' | 'adset' | 'campaign' — usado apenas para insights
  @Column({ type: 'text', name: 'level', default: 'ad' })
  level!: string;

  // HH:MM format e.g. "06:00"
  @Column({ type: 'text', name: 'scheduled_time' })
  scheduled_time!: string;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_run_at' })
  last_run_at?: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
