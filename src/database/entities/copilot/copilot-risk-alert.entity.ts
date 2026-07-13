import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type CopilotRiskSeverity = 'info' | 'warning' | 'critical';
export type CopilotRiskAlertStatus =
  | 'open'
  | 'acknowledged'
  | 'resolved'
  | 'dismissed_false_positive';

@Entity({ name: 'copilot_risk_alert' })
@Index(['launch_id', 'status'])
@Index(['launch_id', 'external_ad_id', 'rule_key', 'detected_on'], {
  unique: true,
})
export class CopilotRiskAlert {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'launch_id' })
  launch_id!: string;

  // Nulo quando o alerta e' no nivel do lancamento (ex: TARGET_BREACH_*),
  // preenchido quando e' especifico de um anuncio (ex: CPL_SPIKE).
  @Column({ type: 'text', name: 'external_ad_id', nullable: true })
  external_ad_id?: string | null;

  @Column({ type: 'text', name: 'ad_name', nullable: true })
  ad_name?: string | null;

  @Column({ type: 'text', name: 'rule_key' })
  rule_key!: string;

  // Data (YYYY-MM-DD) do dado que disparou a regra — usada na dedupe key
  // pra nao recriar o mesmo alerta todo ciclo do scan.
  @Column({ type: 'date', name: 'detected_on' })
  detected_on!: string;

  @Column({ type: 'text', name: 'severity' })
  severity!: CopilotRiskSeverity;

  @Column({ type: 'text', name: 'title' })
  title!: string;

  @Column({ type: 'text', name: 'narrative', nullable: true })
  narrative?: string | null;

  @Column({ type: 'text', name: 'recommendation', nullable: true })
  recommendation?: string | null;

  @Column({
    type: 'numeric',
    name: 'current_value',
    precision: 18,
    scale: 6,
    nullable: true,
  })
  current_value?: number | null;

  @Column({
    type: 'numeric',
    name: 'baseline_value',
    precision: 18,
    scale: 6,
    nullable: true,
  })
  baseline_value?: number | null;

  @Column({
    type: 'numeric',
    name: 'pct_diff',
    precision: 18,
    scale: 6,
    nullable: true,
  })
  pct_diff?: number | null;

  @Column({ type: 'text', name: 'status', default: 'open' })
  status!: CopilotRiskAlertStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
