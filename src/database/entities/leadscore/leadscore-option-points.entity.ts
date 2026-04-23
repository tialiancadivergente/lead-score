import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Question } from '../form/question.entity';
import { QuestionOption } from '../form/question-option.entity';
import { Leadscore } from './leadscore.entity';

@Entity({ name: 'leadscore_option_points' })
export class LeadscoreOptionPoints {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Leadscore, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'leadscore_id' })
  leadscore!: Leadscore;

  @ManyToOne(() => Question, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question!: Question;

  @ManyToOne(() => QuestionOption, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'option_id' })
  option!: QuestionOption;

  @Column({ type: 'double precision', name: 'points' })
  points!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
