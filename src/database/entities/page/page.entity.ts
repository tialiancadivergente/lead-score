import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Form } from '../form/form.entity';
import { FormVersion } from '../form/form-version.entity';
import { Launch } from '../marketing/launch.entity';
import { Season } from '../marketing/season.entity';
import { PageHeadline } from './page-headline.entity';
import { PageTemperature } from './page-temperature.entity';
import { PageVersion } from './page-version.entity';

@Entity({ name: 'page' })
export class Page {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', name: 'abbreviation', unique: true })
  abbreviation!: string;

  @Column({ type: 'text', name: 'name' })
  name!: string;

  @ManyToOne(() => Launch, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'launch_id' })
  launch?: Launch | null;

  @ManyToOne(() => Season, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'season_id' })
  season?: Season | null;

  @ManyToOne(() => Form, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'form_id' })
  form!: Form;

  @ManyToOne(() => FormVersion, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'form_version_id' })
  form_version!: FormVersion;

  @Column({ type: 'boolean', name: 'active', default: true })
  active!: boolean;

  @OneToMany(() => PageHeadline, (headline) => headline.page)
  headlines?: PageHeadline[];

  @OneToMany(() => PageTemperature, (temperature) => temperature.page)
  temperatures?: PageTemperature[];

  @OneToMany(() => PageVersion, (version) => version.page)
  versions?: PageVersion[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
