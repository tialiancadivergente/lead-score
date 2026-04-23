import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FormVersion } from '../form/form-version.entity';

@Entity({ name: 'leadscore' })
export class Leadscore {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => FormVersion, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'form_version_id' })
  form_version!: FormVersion;

  @Column({ type: 'text', name: 'name' })
  name!: string;

  @Column({ type: 'boolean', name: 'active', default: true })
  active!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
