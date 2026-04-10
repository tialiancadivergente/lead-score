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
import { User } from '../system/user.entity';

@Entity({ name: 'oauth_connection' })
export class OAuthConnection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'text', name: 'provider' })
  provider!: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'text', name: 'status', default: 'active' })
  status!: string;

  @Column({ type: 'text', name: 'external_user_id', nullable: true })
  external_user_id?: string;

  @Column({ type: 'text', name: 'external_user_email', nullable: true })
  external_user_email?: string;

  @Column({ type: 'text', name: 'external_account_id', nullable: true })
  external_account_id?: string;

  @Column({ type: 'text', name: 'external_account_name', nullable: true })
  external_account_name?: string;

  @Column({ type: 'text', name: 'access_token', nullable: true })
  access_token?: string;

  @Column({ type: 'text', name: 'refresh_token', nullable: true })
  refresh_token?: string;

  @Column({ type: 'text', name: 'token_type', nullable: true })
  token_type?: string;

  @Column({ type: 'text', array: true, name: 'scopes', nullable: true })
  scopes?: string[];

  @Column({ type: 'timestamptz', name: 'expires_at', nullable: true })
  expires_at?: Date;

  @Column({ type: 'timestamptz', name: 'connected_at', nullable: true })
  connected_at?: Date;

  @Column({ type: 'timestamptz', name: 'last_refreshed_at', nullable: true })
  last_refreshed_at?: Date;

  @Column({ type: 'jsonb', name: 'metadata', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
