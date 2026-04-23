import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Form } from './form.entity';

@Entity({ name: 'form_version' })
export class FormVersion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Form, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'form_id' })
  form!: Form;

  @Column({ type: 'int', name: 'version_number' })
  version_number!: number;

  @Column({ type: 'boolean', name: 'active', default: true })
  active!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
