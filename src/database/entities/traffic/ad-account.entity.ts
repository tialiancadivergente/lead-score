import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Platform } from '../marketing/platform.entity';

@Entity({ name: 'ad_account' })
export class AdAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Platform, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'platform_id' })
  platform?: Platform;

  @Column({ type: 'text', name: 'name' })
  name!: string;

  @Column({ type: 'jsonb', name: 'external_reference', nullable: true })
  external_reference?: any;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
