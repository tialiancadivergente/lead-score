import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionGroup } from './auth.types';
import { User } from '../database/entities/system/user.entity';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getAuthenticatedUser(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId, isActive: true },
      relations: { roles: { permissions: true } },
    });

    if (!user || user.deletedAt) return null;

    const roles = (user.roles ?? []).map((role) => role.name);
    const isSuperAdmin = roles.includes('super_admin');

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles,
      permissions: this.resolvePermissions(user),
      isSuperAdmin,
    };
  }

  resolvePermissions(user: User): PermissionGroup[] {
    const grouped = new Map<string, Set<string>>();

    for (const role of user.roles ?? []) {
      for (const permission of role.permissions ?? []) {
        if (!grouped.has(permission.module)) {
          grouped.set(permission.module, new Set<string>());
        }
        grouped.get(permission.module)?.add(permission.action);
      }
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([module, actions]) => ({
        module,
        actions: Array.from(actions).sort() as PermissionGroup['actions'],
      }));
  }

  hasPermission(
    user: { isSuperAdmin: boolean; permissions: PermissionGroup[] },
    module: string,
    action: string,
  ) {
    if (user.isSuperAdmin) return true;
    return user.permissions.some(
      (permission) =>
        permission.module === module &&
        permission.actions.includes(action as never),
    );
  }
}
