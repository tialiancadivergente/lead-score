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
import { Person } from '../identity/person.entity';
import { HotmartSaleRaw } from './hotmart-sale-raw.entity';

@Entity({ name: 'hotmart_sale' })
export class HotmartSale {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => HotmartSaleRaw, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'raw_id' })
  raw!: HotmartSaleRaw;

  @Column({ type: 'uuid', name: 'raw_id' })
  raw_id!: string;

  @Index()
  @ManyToOne(() => Person, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'person_id' })
  person?: Person;

  @Column({ type: 'uuid', name: 'person_id', nullable: true })
  person_id?: string;

  @Index({ unique: true })
  @Column({ type: 'text', name: 'transaction_code' })
  transaction_code!: string;

  @Column({ type: 'text', name: 'source_account', nullable: true })
  source_account?: string;

  // ── Produto ────────────────────────────────────────────────────────────────

  @Index()
  @Column({ type: 'bigint', name: 'product_id', nullable: true })
  product_id?: number;

  @Column({ type: 'text', name: 'product_name', nullable: true })
  product_name?: string;

  @Column({ type: 'text', name: 'offer_code', nullable: true })
  offer_code?: string;

  @Column({ type: 'text', name: 'payment_mode', nullable: true })
  payment_mode?: string;

  // ── Compra ─────────────────────────────────────────────────────────────────

  @Index()
  @Column({ type: 'text', name: 'purchase_status', nullable: true })
  purchase_status?: string;

  @Column({ type: 'text', name: 'payment_type', nullable: true })
  payment_type?: string;

  @Column({ type: 'text', name: 'payment_method', nullable: true })
  payment_method?: string;

  @Column({ type: 'int', name: 'installments', nullable: true })
  installments?: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'price',
    nullable: true,
  })
  price?: number;

  @Column({ type: 'text', name: 'currency_code', nullable: true })
  currency_code?: string;

  @Column({ type: 'boolean', name: 'is_subscription', default: false })
  is_subscription!: boolean;

  // ── Datas ──────────────────────────────────────────────────────────────────

  @Index()
  @Column({ type: 'timestamptz', name: 'order_date', nullable: true })
  order_date?: Date;

  @Column({ type: 'timestamptz', name: 'approved_date', nullable: true })
  approved_date?: Date;

  @Column({ type: 'timestamptz', name: 'warranty_expire_date', nullable: true })
  warranty_expire_date?: Date;

  // ── Atribuição de marketing ────────────────────────────────────────────────

  @Column({ type: 'text', name: 'tracking_source', nullable: true })
  tracking_source?: string;

  @Column({ type: 'text', name: 'tracking_source_sck', nullable: true })
  tracking_source_sck?: string;

  @Column({ type: 'text', name: 'external_code', nullable: true })
  external_code?: string;

  // ── Buyer desnormalizado ───────────────────────────────────────────────────

  @Index()
  @Column({ type: 'text', name: 'buyer_email', nullable: true })
  buyer_email?: string;

  @Column({ type: 'text', name: 'buyer_name', nullable: true })
  buyer_name?: string;

  @Column({ type: 'text', name: 'buyer_ucode', nullable: true })
  buyer_ucode?: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
