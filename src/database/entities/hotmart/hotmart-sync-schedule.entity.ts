import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'hotmart_sync_schedule' })
export class HotmartSyncSchedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', nullable: true })
  name?: string;

  // 'last_7d' | 'last_30d' | 'last_90d' | 'custom'
  @Column({ type: 'text', name: 'period_preset' })
  period_preset!: string;

  @Column({ type: 'text', name: 'date_from', nullable: true })
  date_from?: string;

  @Column({ type: 'text', name: 'date_to', nullable: true })
  date_to?: string;

  @Column({ type: 'text', name: 'transaction_status', nullable: true })
  transaction_status?: string;

  // HH:MM format e.g. "09:00"
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
