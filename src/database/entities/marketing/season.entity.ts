import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Launch } from './launch.entity';

@Entity({ name: 'season' })
export class Season {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Launch, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'launch_id' })
  launch?: Launch;

  @Column({ type: 'text', name: 'name' })
  name!: string;

  @Column({ type: 'boolean', name: 'active', default: true })
  active!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
