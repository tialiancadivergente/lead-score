import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'launch_dashboard_config' })
export class LaunchDashboardConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', name: 'launch_id' })
  launch_id!: string;

  // ─── Metas / Targets ──────────────────────────────────────────────────────

  @Column({ type: 'numeric', name: 'target_spend', nullable: true })
  target_spend?: number;

  @Column({ type: 'int', name: 'target_leads', nullable: true })
  target_leads?: number;

  @Column({ type: 'numeric', name: 'target_cpl', nullable: true })
  target_cpl?: number;

  @Column({ type: 'numeric', name: 'target_connect_rate', nullable: true })
  target_connect_rate?: number;

  @Column({ type: 'numeric', name: 'target_page_conversion', nullable: true })
  target_page_conversion?: number;

  @Column({ type: 'numeric', name: 'target_cpc', nullable: true })
  target_cpc?: number;

  @Column({ type: 'numeric', name: 'target_cpm', nullable: true })
  target_cpm?: number;

  @Column({ type: 'numeric', name: 'target_ctr', nullable: true })
  target_ctr?: number;

  @Column({
    type: 'numeric',
    name: 'target_survey_response_rate',
    nullable: true,
  })
  target_survey_response_rate?: number;

  @Column({
    type: 'numeric',
    name: 'target_consciousness_rate',
    nullable: true,
  })
  target_consciousness_rate?: number;

  @Column({ type: 'numeric', name: 'target_knows_elton_rate', nullable: true })
  target_knows_expert_rate?: number;

  @Column({
    type: 'numeric',
    name: 'target_knows_alliance_rate',
    nullable: true,
  })
  target_knows_alliance_rate?: number;

  // ─── Notificação / Monitoramento ─────────────────────────────────────────

  @Column({ type: 'varchar', name: 'notification_metric', length: 50, nullable: true })
  notification_metric?: string;

  @Column({ type: 'date', name: 'notification_date_from', nullable: true })
  notification_date_from?: string;

  @Column({ type: 'date', name: 'notification_date_to', nullable: true })
  notification_date_to?: string;

  // ─── Question keys para métricas de consciência ───────────────────────────

  @Column({ type: 'text', name: 'question_key_consciousness', nullable: true })
  question_key_consciousness?: string;

  @Column({
    type: 'text',
    name: 'positive_option_key_consciousness',
    nullable: true,
  })
  positive_option_key_consciousness?: string;

  @Column({ type: 'text', name: 'question_key_knows_elton', nullable: true })
  question_key_knows_expert?: string;

  @Column({
    type: 'text',
    name: 'positive_option_key_knows_elton',
    nullable: true,
  })
  positive_option_key_knows_expert?: string;

  @Column({ type: 'text', name: 'question_key_knows_alliance', nullable: true })
  question_key_knows_alliance?: string;

  @Column({
    type: 'text',
    name: 'positive_option_key_knows_alliance',
    nullable: true,
  })
  positive_option_key_knows_alliance?: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
