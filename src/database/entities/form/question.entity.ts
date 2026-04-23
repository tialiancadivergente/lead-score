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

@Entity({ name: 'question' })
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Form, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'form_id' })
  form!: Form;

  @Column({ type: 'text', name: 'question_key' })
  question_key!: string;

  @Column({ type: 'text', name: 'question_text', nullable: true })
  question_text?: string;

  @Column({ type: 'text', name: 'input_type', nullable: true })
  input_type?: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
