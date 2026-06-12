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
import { Page } from './page.entity';

@Entity({ name: 'page_headline' })
@Index('uq_page_headline_abbreviation', ['page', 'abbreviation'], {
  unique: true,
})
@Index('uq_page_headline_position', ['page', 'position'], { unique: true })
export class PageHeadline {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Page, (page) => page.headlines, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'page_id' })
  page!: Page;

  @Column({ type: 'text', name: 'abbreviation' })
  abbreviation!: string;

  @Column({ type: 'text', name: 'content' })
  content!: string;

  @Column({ type: 'int', name: 'position' })
  position!: number;

  @Column({ type: 'boolean', name: 'active', default: true })
  active!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
