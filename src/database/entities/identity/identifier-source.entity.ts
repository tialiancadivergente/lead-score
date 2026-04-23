import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum IdentifierSourceCode {
  FORM = 'FORM',
  API = 'API',
  MANUAL = 'MANUAL',
  IMPORT = 'IMPORT',
  WEBHOOK = 'WEBHOOK',
}

@Entity({ name: 'identifier_source' })
export class IdentifierSource {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'text', name: 'code' })
  code!: IdentifierSourceCode;

  @Column({ type: 'text', name: 'description', nullable: true })
  description?: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
