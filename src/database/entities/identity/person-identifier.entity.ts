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
import { Person } from './person.entity';
import { IdentifierType } from './identifier-type.entity';

@Entity({ name: 'person_identifier' })
@Index(['identifier_type', 'value_normalized'])
export class PersonIdentifier {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Person, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'person_id' })
  person!: Person;

  @ManyToOne(() => IdentifierType, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'identifier_type_id' })
  identifier_type!: IdentifierType;

  @Column({ type: 'text', name: 'value_normalized' })
  value_normalized!: string;

  @Column({ type: 'text', name: 'value_hash', nullable: true })
  value_hash?: string;

  @Column({ type: 'boolean', name: 'is_primary', default: false })
  is_primary!: boolean;

  @Column({ type: 'timestamptz', name: 'verified_at', nullable: true })
  verified_at?: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
