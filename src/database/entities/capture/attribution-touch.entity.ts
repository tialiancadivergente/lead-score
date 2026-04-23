import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Capture } from './capture.entity';
import { Person } from '../identity/person.entity';
import { Platform } from '../marketing/platform.entity';

@Entity({ name: 'attribution_touch' })
export class AttributionTouch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Person, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'person_id' })
  person?: Person;

  @ManyToOne(() => Capture, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'capture_id' })
  capture?: Capture;

  @Column({ type: 'timestamptz', name: 'occurred_at', nullable: true })
  occurred_at?: Date;

  @ManyToOne(() => Platform, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'platform_id' })
  platform?: Platform;

  @Column({ type: 'jsonb', name: 'traffic_ids', nullable: true })
  traffic_ids?: any;

  @Column({ type: 'text', name: 'touch_type', nullable: true })
  touch_type?: string;

  @Column({ type: 'double precision', name: 'weight', nullable: true })
  weight?: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;
}
