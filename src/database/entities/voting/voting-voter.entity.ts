import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'voting_voter' })
export class VotingVoter {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', name: 'name' })
  name!: string;

  @Column({ type: 'text', name: 'email' })
  email!: string;

  @Index({ unique: true })
  @Column({ type: 'text', name: 'email_normalized' })
  email_normalized!: string;

  @Column({ type: 'text', name: 'phone' })
  phone!: string;

  @Index({ unique: true })
  @Column({ type: 'text', name: 'phone_normalized' })
  phone_normalized!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
