import { Column, Entity, Index, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from './role.entity';

@Entity({ name: 'permissions' })
@Index(['module', 'action'], { unique: true })
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 60 })
  module!: string;

  @Column({ type: 'varchar', length: 20 })
  action!: string;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles!: Role[];
}
