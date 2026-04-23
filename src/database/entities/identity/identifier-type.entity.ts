import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum IdentifierTypeCode {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  CPF = 'CPF',
}

@Entity({ name: 'identifier_type' })
export class IdentifierType {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'text', name: 'code' })
  code!: IdentifierTypeCode;

  @Column({ type: 'text', name: 'description', nullable: true })
  description?: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
