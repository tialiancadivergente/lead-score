import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OAuthConnection } from '../integrations/oauth-connection.entity';

@Entity({ name: 'marketing_extract_job' })
export class MarketingExtractJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => OAuthConnection, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'oauth_connection_id' })
  oauth_connection!: OAuthConnection;

  @Index()
  @Column({ type: 'text', name: 'provider' })
  provider!: string;

  @Column({ type: 'text', name: 'external_account_id' })
  external_account_id!: string;

  @Column({ type: 'date', name: 'date_from' })
  date_from!: string;

  @Column({ type: 'date', name: 'date_to' })
  date_to!: string;

  @Column({ type: 'text', name: 'preset', nullable: true })
  preset?: string;

  @Index()
  @Column({ type: 'text', name: 'status', default: 'pending' })
  status!: string;

  @Column({ type: 'timestamptz', name: 'requested_at' })
  requested_at!: Date;

  @Column({ type: 'timestamptz', name: 'started_at', nullable: true })
  started_at?: Date;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completed_at?: Date;

  @Column({ type: 'text', name: 'error_message', nullable: true })
  error_message?: string;

  @Column({ type: 'jsonb', name: 'metadata', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
