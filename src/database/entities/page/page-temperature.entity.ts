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
import { Temperature } from '../marketing/temperature.entity';
import { Page } from './page.entity';

@Entity({ name: 'page_temperature' })
@Index('uq_page_temperature_temperature', ['page', 'temperature'], {
  unique: true,
})
export class PageTemperature {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Page, (page) => page.temperatures, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'page_id' })
  page!: Page;

  @ManyToOne(() => Temperature, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'temperature_id' })
  temperature!: Temperature;

  @Column({ type: 'text', name: 'tag_id' })
  tag_id!: string;

  @Column({ type: 'text', name: 'redirect_url' })
  redirect_url!: string;

  @Column({ type: 'boolean', name: 'active', default: true })
  active!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
