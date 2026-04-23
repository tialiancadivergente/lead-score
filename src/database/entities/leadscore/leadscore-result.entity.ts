import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FormResponse } from '../form/form-response.entity';
import { Leadscore } from './leadscore.entity';
import { LeadscoreTier } from './leadscore-tier.entity';

@Entity({ name: 'leadscore_result' })
export class LeadscoreResult {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Leadscore, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'leadscore_id' })
  leadscore!: Leadscore;

  @ManyToOne(() => FormResponse, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'form_response_id' })
  form_response!: FormResponse;

  @Column({ type: 'double precision', name: 'score_total', nullable: true })
  score_total?: number;

  @ManyToOne(() => LeadscoreTier, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tier_id' })
  tier?: LeadscoreTier;

  @Column({ type: 'jsonb', name: 'breakdown', nullable: true })
  breakdown?: any;

  @Column({ type: 'timestamptz', name: 'calculated_at', nullable: true })
  calculated_at?: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
