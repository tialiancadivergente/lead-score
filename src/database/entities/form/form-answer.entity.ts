import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FormResponse } from './form-response.entity';
import { Question } from './question.entity';
import { QuestionOption } from './question-option.entity';

@Entity({ name: 'form_answer' })
export class FormAnswer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => FormResponse, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'form_response_id' })
  form_response!: FormResponse;

  @ManyToOne(() => Question, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question!: Question;

  @ManyToOne(() => QuestionOption, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'option_id' })
  option?: QuestionOption;

  @Column({ type: 'text', name: 'answer_text', nullable: true })
  answer_text?: string;

  @Column({ type: 'double precision', name: 'answer_number', nullable: true })
  answer_number?: number;

  @Column({ type: 'boolean', name: 'answer_bool', nullable: true })
  answer_bool?: boolean;

  @Column({ type: 'timestamptz', name: 'answered_at', nullable: true })
  answered_at?: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
