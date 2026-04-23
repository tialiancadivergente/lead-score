import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Question } from './question.entity';

@Entity({ name: 'question_option' })
export class QuestionOption {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Question, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question!: Question;

  @Column({ type: 'text', name: 'option_key' })
  option_key!: string;

  @Column({ type: 'text', name: 'option_text', nullable: true })
  option_text?: string;

  @Column({ type: 'int', name: 'display_order', default: 0 })
  display_order!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
