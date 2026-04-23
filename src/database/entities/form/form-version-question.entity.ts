import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FormVersion } from './form-version.entity';
import { Question } from './question.entity';

@Entity({ name: 'form_version_question' })
export class FormVersionQuestion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => FormVersion, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'form_version_id' })
  form_version!: FormVersion;

  @ManyToOne(() => Question, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question!: Question;

  @Column({ type: 'int', name: 'display_order', default: 0 })
  display_order!: number;

  @Column({ type: 'boolean', name: 'required', default: false })
  required!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
