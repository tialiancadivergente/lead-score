import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'temperature' })
export class Temperature {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', name: 'abbreviation', nullable: true })
  abbreviation?: string;

  @Column({ type: 'text', name: 'name' })
  name!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
