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
import { Leadscore } from './leadscore.entity';

@Entity({ name: 'leadscore_range_points' })
export class LeadscoreRangePoints {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Leadscore, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'leadscore_id' })
  leadscore!: Leadscore;

  @ManyToOne(() => Question, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question!: Question;

  @Column({ type: 'double precision', name: 'min_value', nullable: true })
  min_value?: number;

  @Column({ type: 'double precision', name: 'max_value', nullable: true })
  max_value?: number;

  @Column({ type: 'double precision', name: 'points' })
  points!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
