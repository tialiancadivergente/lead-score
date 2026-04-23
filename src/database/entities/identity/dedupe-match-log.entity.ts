import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Capture } from '../capture/capture.entity';
import { IdentifierSource } from './identifier-source.entity';
import { Person } from './person.entity';

export enum DedupeMatchedBy {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  CPF = 'CPF',
  NONE = 'NONE',
}

@Entity({ name: 'dedupe_match_log' })
export class DedupeMatchLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Capture, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'capture_id' })
  capture!: Capture;

  @ManyToOne(() => Person, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'person_id' })
  person?: Person;

  @ManyToOne(() => IdentifierSource, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'identifier_source_id' })
  identifier_source?: IdentifierSource;

  @Column({ type: 'text', name: 'matched_by', nullable: true })
  matched_by?: DedupeMatchedBy;

  @Column({ type: 'text', name: 'matched_value_hash', nullable: true })
  matched_value_hash?: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;
}
