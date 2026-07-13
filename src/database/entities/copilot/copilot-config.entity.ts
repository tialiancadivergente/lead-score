import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type CopilotRiskSensitivity = 'low' | 'medium' | 'high';

@Entity({ name: 'copilot_config' })
export class CopilotConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', name: 'launch_id' })
  launch_id!: string;

  @Column({ type: 'text', name: 'risk_sensitivity', default: 'medium' })
  risk_sensitivity!: CopilotRiskSensitivity;

  // Lista separada por virgula das rule_key ativas (mesmo padrao de
  // notification_metrics em launch_dashboard_config). Nulo = todas ativas.
  @Column({ type: 'text', name: 'enabled_rules', nullable: true })
  enabled_rules?: string | null;

  // Notas livres do gestor de trafego, injetadas no system prompt da IA
  // (ex: "ignore quedas de fim de semana, esse publico nao compra sabado/domingo").
  @Column({ type: 'text', name: 'extra_context', nullable: true })
  extra_context?: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
