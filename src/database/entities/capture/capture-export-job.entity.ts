import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type CaptureExportFormat = 'csv' | 'xlsx';
export type CaptureExportJobStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

@Entity({ name: 'capture_export_job' })
export class CaptureExportJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', name: 'format' })
  format!: CaptureExportFormat;

  @Column({ type: 'jsonb', name: 'filters' })
  filters!: Record<string, unknown>;

  @Index()
  @Column({ type: 'text', name: 'status', default: 'pending' })
  status!: CaptureExportJobStatus;

  @Column({ type: 'int', name: 'total_items', nullable: true })
  total_items?: number | null;

  @Column({ type: 'int', name: 'processed_items', default: 0 })
  processed_items!: number;

  @Column({ type: 'text', name: 'file_name', nullable: true })
  file_name?: string | null;

  @Column({ type: 'bytea', name: 'file_data', nullable: true })
  file_data?: Buffer | null;

  @Column({ type: 'text', name: 'error_message', nullable: true })
  error_message?: string | null;

  @Column({ type: 'timestamptz', name: 'started_at', nullable: true })
  started_at?: Date | null;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completed_at?: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
