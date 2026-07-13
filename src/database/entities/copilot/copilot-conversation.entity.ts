import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'copilot_conversation' })
@Index(['launch_id'])
export class CopilotConversation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'launch_id' })
  launch_id!: string;

  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  user_id?: string;

  @Column({ type: 'text', name: 'title', nullable: true })
  title?: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
