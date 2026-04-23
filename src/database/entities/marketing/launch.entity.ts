import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'launch' })
export class Launch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', name: 'name' })
  name!: string;

  @Column({ type: 'boolean', name: 'active', default: true })
  active!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
