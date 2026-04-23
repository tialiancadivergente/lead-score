import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Person } from '../identity/person.entity';
import { Capture } from '../capture/capture.entity';
import { FormVersion } from './form-version.entity';

@Entity({ name: 'form_response' })
export class FormResponse {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => FormVersion, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'form_version_id' })
  form_version!: FormVersion;

  @ManyToOne(() => Person, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'person_id' })
  person?: Person;

  @ManyToOne(() => Capture, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'capture_id' })
  capture?: Capture;

  @Column({ type: 'timestamptz', name: 'submitted_at', nullable: true })
  submitted_at?: Date;

  @Column({ type: 'jsonb', name: 'raw_payload', nullable: true })
  raw_payload?: any;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
