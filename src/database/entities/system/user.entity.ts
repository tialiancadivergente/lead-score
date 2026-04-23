import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'user' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', name: 'name' })
  name!: string;

  @Index({ unique: true })
  @Column({ type: 'text', name: 'email' })
  email!: string;

  @Column({ type: 'text', name: 'password_hash' })
  password_hash!: string;

  @Column({ type: 'boolean', name: 'active', default: true })
  active!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;

  @Column({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deleted_at?: Date;

  @Column({ type: 'timestamptz', name: 'last_login', nullable: true })
  last_login?: Date;
}
