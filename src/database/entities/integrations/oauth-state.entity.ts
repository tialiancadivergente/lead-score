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

@Entity({ name: 'oauth_state' })
export class OAuthState {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'text', name: 'state' })
  state!: string;

  @Index()
  @Column({ type: 'text', name: 'provider' })
  provider!: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'text', name: 'status', default: 'pending' })
  status!: string;

  @Column({ type: 'text', name: 'callback_url' })
  callback_url!: string;

  @Column({ type: 'text', name: 'frontend_redirect_url', nullable: true })
  frontend_redirect_url?: string;

  @Column({ type: 'text', array: true, name: 'scopes', nullable: true })
  scopes?: string[];

  @Column({ type: 'jsonb', name: 'context', nullable: true })
  context?: Record<string, unknown>;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expires_at!: Date;

  @Column({ type: 'timestamptz', name: 'consumed_at', nullable: true })
  consumed_at?: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
