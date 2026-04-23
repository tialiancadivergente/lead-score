import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Platform } from './platform.entity';

export enum StrategyName {
  ORGANICO = 'Orgânico',
  PATROCINADO = 'Patrocinado',
}

@Entity({ name: 'strategy' })
export class Strategy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Platform, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'platform_id' })
  platform?: Platform;

  @Column({ type: 'text', name: 'name' })
  name!: StrategyName;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
