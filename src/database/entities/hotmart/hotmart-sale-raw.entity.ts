import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'hotmart_sale_raw' })
export class HotmartSaleRaw {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'text', name: 'event', nullable: true })
  event?: string;

  @Column({ type: 'text', name: 'transaction_code', nullable: true })
  transaction_code?: string;

  @Index()
  @Column({ type: 'text', name: 'source_account', nullable: true })
  source_account?: string;

  @Index()
  @Column({ type: 'text', name: 'buyer_email', nullable: true })
  buyer_email?: string;

  @Index()
  @Column({ type: 'text', name: 'import_status', default: 'pending' })
  import_status!: string;

  @Column({ type: 'jsonb', name: 'payload' })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @Column({ type: 'timestamptz', name: 'processed_at', nullable: true })
  processed_at?: Date;

  @Column({ type: 'text', name: 'error', nullable: true })
  error?: string;
}
