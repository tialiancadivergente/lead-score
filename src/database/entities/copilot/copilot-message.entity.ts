import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type CopilotMessageRole = 'user' | 'assistant' | 'tool' | 'system';

@Entity({ name: 'copilot_message' })
@Index(['conversation_id'])
export class CopilotMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'conversation_id' })
  conversation_id!: string;

  @Column({ type: 'text', name: 'role' })
  role!: CopilotMessageRole;

  @Column({ type: 'text', name: 'content', nullable: true })
  content?: string | null;

  // Chamadas de tool feitas pelo modelo neste turno (auditoria/debug) —
  // guarda nome da tool + args + resultado resumido.
  @Column({ type: 'jsonb', name: 'tool_calls', nullable: true })
  tool_calls?: Record<string, unknown>[] | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;
}
