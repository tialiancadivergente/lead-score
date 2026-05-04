import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'marketing_sync_configuration' })
@Index('UQ_marketing_sync_configuration_sync_key_provider', ['sync_key', 'provider'], {
  unique: true,
})
export class MarketingSyncConfiguration {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', name: 'sync_key' })
  sync_key!: string;

  @Column({ type: 'text', name: 'provider', nullable: true })
  provider?: string | null;

  @Column({ type: 'boolean', name: 'enabled', default: true })
  enabled!: boolean;

  @Column({ type: 'boolean', name: 'schedule_enabled', default: false })
  schedule_enabled!: boolean;

  @Column({ type: 'integer', name: 'schedule_interval_minutes', nullable: true })
  schedule_interval_minutes?: number | null;

  @Column({ type: 'jsonb', name: 'config', nullable: true })
  config?: Record<string, unknown> | null;

  @Column({ type: 'jsonb', name: 'metadata', nullable: true })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
