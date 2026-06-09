import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type MetaSyncExecutionStatus =
  | 'running'
  | 'completed'
  | 'failed'
  | 'partial'
  | 'aborted';

export type MetaSyncExecutionStep =
  | 'campaigns'
  | 'adsets'
  | 'ads'
  | 'insights'
  | 'full';

@Entity({ name: 'meta_sync_executions' })
export class MetaSyncExecution {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', name: 'triggered_by', default: 'scheduler' })
  triggered_by!: string;

  @Column({ type: 'text', name: 'step' })
  step!: MetaSyncExecutionStep;

  @Column({
    type: 'text',
    name: 'status',
    default: 'running',
  })
  status!: MetaSyncExecutionStatus;

  @Column({ type: 'text', name: 'external_account_id', nullable: true })
  external_account_id?: string;

  @Column({ type: 'text', name: 'date_from', nullable: true })
  date_from?: string;

  @Column({ type: 'text', name: 'date_to', nullable: true })
  date_to?: string;

  @Column({ type: 'int', name: 'records_processed', default: 0 })
  records_processed!: number;

  @Column({ type: 'text', name: 'error_message', nullable: true })
  error_message?: string;

  @Column({ type: 'jsonb', name: 'metadata', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz', name: 'started_at' })
  started_at!: Date;

  @Column({ type: 'timestamptz', name: 'finished_at', nullable: true })
  finished_at?: Date;
}
