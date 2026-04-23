import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Launch } from '../marketing/launch.entity';
import { Season } from '../marketing/season.entity';

@Entity({ name: 'form' })
export class Form {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', name: 'name' })
  name!: string;

  @Column({ type: 'text', name: 'type', nullable: true })
  type?: string;

  @ManyToOne(() => Launch, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'launch_id' })
  launch?: Launch;

  @ManyToOne(() => Season, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'season_id' })
  season?: Season;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
