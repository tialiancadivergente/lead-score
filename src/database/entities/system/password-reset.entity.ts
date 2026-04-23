import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'password_reset' })
export class PasswordReset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'requested_by' })
  requested_by?: User;

  @Index({ unique: true })
  @Column({ type: 'text', name: 'token' })
  token!: string;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expires_at!: Date;

  @Column({ type: 'boolean', name: 'used', default: false })
  used!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;
}
