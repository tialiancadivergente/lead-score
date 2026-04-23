import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Leadscore } from './leadscore.entity';
import { LeadscoreTier } from './leadscore-tier.entity';

@Entity({ name: 'leadscore_tier_rule' })
export class LeadscoreTierRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Leadscore, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'leadscore_id' })
  leadscore!: Leadscore;

  @ManyToOne(() => LeadscoreTier, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tier_id' })
  tier!: LeadscoreTier;

  @Column({ type: 'double precision', name: 'min_score', nullable: true })
  min_score?: number;

  @Column({ type: 'double precision', name: 'max_score', nullable: true })
  max_score?: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
