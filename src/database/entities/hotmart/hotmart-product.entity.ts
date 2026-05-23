import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Launch } from '../marketing/launch.entity';

@Entity({ name: 'hotmart_product' })
export class HotmartProduct {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @ManyToOne(() => Launch, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'launch_id' })
  launch?: Launch;

  @Column({ type: 'uuid', name: 'launch_id', nullable: true })
  launch_id?: string;

  @Column({ type: 'text', name: 'name' })
  name!: string;

  @Index()
  @Column({ type: 'bigint', name: 'product_id' })
  product_id!: number;

  @Column({ type: 'boolean', name: 'active', default: true })
  active!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
