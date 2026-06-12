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

@Entity({ name: 'page_version' })
@Index('uq_page_version_abbreviation', ['page', 'abbreviation'], {
  unique: true,
})
@Index('uq_page_version_number', ['page', 'version_number'], { unique: true })
export class PageVersion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Page, (page) => page.versions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'page_id' })
  page!: Page;

  @Column({ type: 'text', name: 'abbreviation' })
  abbreviation!: string;

  @Column({ type: 'int', name: 'version_number' })
  version_number!: number;

  @Column({ type: 'text', name: 'template_image_url', nullable: true })
  template_image_url?: string | null;

  @Column({ type: 'text', name: 'template_url', nullable: true })
  template_url?: string | null;

  @Column({ type: 'boolean', name: 'active', default: true })
  active!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
