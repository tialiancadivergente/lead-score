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

@Entity({ name: 'audit_logs' })
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId?: string | null;

  @ManyToOne(() => User, (user) => user.auditLogs, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @Column({ type: 'varchar', length: 120 })
  action!: string;

  @Column({ type: 'varchar', length: 120 })
  resource!: string;

  @Column({ type: 'varchar', length: 120, name: 'resource_id', nullable: true })
  resourceId?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  ip?: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
