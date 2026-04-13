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

@Entity({ name: 'marketing_connection_account' })
export class MarketingConnectionAccount {
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

  @Column({ type: 'text', name: 'external_account_name', nullable: true })
  external_account_name?: string;

  @Column({
    type: 'text',
    name: 'parent_external_account_id',
    nullable: true,
  })
  parent_external_account_id?: string;

  @Column({ type: 'boolean', name: 'is_manager', default: false })
  is_manager!: boolean;

  @Column({ type: 'text', name: 'status', default: 'active' })
  status!: string;

  @Column({ type: 'boolean', name: 'selected', default: false })
  selected!: boolean;

  @Column({ type: 'timestamptz', name: 'last_seen_at', nullable: true })
  last_seen_at?: Date;

  @Column({ type: 'jsonb', name: 'metadata', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
