import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'inlead_webhook_activecampaign_log' })
export class InleadWebhookActiveCampaignLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', name: 'email', nullable: true })
  email?: string;

  @Column({ type: 'text', name: 'telefone', nullable: true })
  telefone?: string;

  @Column({ type: 'text', name: 'telefone_normalizado', nullable: true })
  telefone_normalizado?: string;

  @Column({ type: 'text', name: 'launch' })
  launch!: string;

  @Column({ type: 'text', name: 'season' })
  season!: string;

  @Column({ type: 'text', name: 'tag_name' })
  tag_name!: string;

  @Column({ type: 'text', name: 'tag_id' })
  tag_id!: string;

  @Column({ type: 'text', name: 'page', nullable: true })
  page?: string;

  @Column({ type: 'text', name: 'path', nullable: true })
  path?: string;

  @Column({ type: 'text', name: 'referer', nullable: true })
  referer?: string;

  @Column({ type: 'text', name: 'ip', nullable: true })
  ip?: string;

  @Column({ type: 'text', name: 'user_agent', nullable: true })
  user_agent?: string;

  @Column({ type: 'text', name: 'utm_source', nullable: true })
  utm_source?: string;

  @Column({ type: 'text', name: 'utm_medium', nullable: true })
  utm_medium?: string;

  @Column({ type: 'text', name: 'utm_campaign', nullable: true })
  utm_campaign?: string;

  @Column({ type: 'text', name: 'utm_id', nullable: true })
  utm_id?: string;

  @Column({ type: 'text', name: 'utm_term', nullable: true })
  utm_term?: string;

  @Column({ type: 'text', name: 'utm_content', nullable: true })
  utm_content?: string;

  @Column({ type: 'text', name: 'external_code', nullable: true })
  external_code?: string;

  @Column({ type: 'integer', name: 'external_score', nullable: true })
  external_score?: number;

  @Column({ type: 'jsonb', name: 'raw_payload' })
  raw_payload!: Record<string, any>;

  @Column({ type: 'jsonb', name: 'normalized_payload' })
  normalized_payload!: Record<string, any>;

  @Column({ type: 'jsonb', name: 'activecampaign_response', nullable: true })
  activecampaign_response?: Record<string, any>;

  @Column({ type: 'text', name: 'status', default: 'received' })
  status!: string;

  @Column({ type: 'text', name: 'error_message', nullable: true })
  error_message?: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @Column({ type: 'timestamptz', name: 'sent_at', nullable: true })
  sent_at?: Date;
}
