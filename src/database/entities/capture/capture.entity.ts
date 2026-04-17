import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FormVersion } from '../form/form-version.entity';
import { Launch } from '../marketing/launch.entity';
import { Platform } from '../marketing/platform.entity';
import { Season } from '../marketing/season.entity';
import { Strategy } from '../marketing/strategy.entity';
import { Temperature } from '../marketing/temperature.entity';
import { Person } from '../identity/person.entity';

@Entity({ name: 'capture' })
export class Capture {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Person, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'person_id' })
  person?: Person;

  @Column({ type: 'timestamptz', name: 'occurred_at', nullable: true })
  occurred_at?: Date;

  @Column({ type: 'text', name: 'page', nullable: true })
  page?: string;

  @Column({ type: 'text', name: 'path', nullable: true })
  path?: string;

  @Column({ type: 'text', name: 'utm_source', nullable: true })
  utm_source?: string;

  @Column({ type: 'text', name: 'utm_medium', nullable: true })
  utm_medium?: string;

  @Column({ type: 'text', name: 'utm_campaign', nullable: true })
  utm_campaign?: string;

  @Column({ type: 'text', name: 'utm_content', nullable: true })
  utm_content?: string;

  @Column({ type: 'text', name: 'ad_id', nullable: true })
  ad_id?: string;

  @Column({ type: 'text', name: 'external_ad_id', nullable: true })
  external_ad_id?: string;

  @Column({ type: 'text', name: 'utm_term', nullable: true })
  utm_term?: string;

  @Column({ type: 'text', name: 'utm_id', nullable: true })
  utm_id?: string;

  @Column({ type: 'text', name: 'tag_id' })
  tag_id!: string;

  @Column({ type: 'jsonb', name: 'utms', nullable: true })
  utms?: any;

  @ManyToOne(() => Platform, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'platform_id' })
  platform?: Platform;

  @ManyToOne(() => Strategy, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'strategy_id' })
  strategy?: Strategy;

  @ManyToOne(() => Temperature, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'temperature_id' })
  temperature?: Temperature;

  @ManyToOne(() => Launch, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'launch_id' })
  launch?: Launch;

  @ManyToOne(() => Season, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'season_id' })
  season?: Season;

  @ManyToOne(() => FormVersion, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'form_version_id' })
  form_version?: FormVersion;

  @Column({ type: 'jsonb', name: 'metadata', nullable: true })
  metadata?: any;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
