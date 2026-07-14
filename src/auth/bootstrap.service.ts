import {
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, timingSafeEqual } from 'crypto';
import { DataSource, In } from 'typeorm';
import { RBAC_ACTIONS, RBAC_MODULES } from './auth.types';
import { BootstrapDto } from './dto/bootstrap.dto';
import { AuditLog } from '../database/entities/system/audit-log.entity';
import { Permission } from '../database/entities/system/permission.entity';
import { Role } from '../database/entities/system/role.entity';
import { User } from '../database/entities/system/user.entity';

interface BootstrapContext {
  token?: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class BootstrapService {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async bootstrap(dto: BootstrapDto, context: BootstrapContext) {
    const expectedToken = this.config.get<string>('BOOTSTRAP_TOKEN');
    if (!expectedToken) {
      throw new ServiceUnavailableException('Bootstrap disabled');
    }

    if (!this.constantTimeTokenMatches(context.token ?? '', expectedToken)) {
      this.logger.warn(
        `Invalid bootstrap token attempt from ip=${context.ip ?? 'unknown'} userAgent=${context.userAgent ?? 'unknown'}`,
      );
      throw new UnauthorizedException('Invalid bootstrap token');
    }

    return this.dataSource.transaction(async (manager) => {
      const roleRepo = manager.getRepository(Role);
      const permissionRepo = manager.getRepository(Permission);
      const userRepo = manager.getRepository(User);
      const auditRepo = manager.getRepository(AuditLog);

      let superAdminRole = await roleRepo.findOne({
        where: { name: 'super_admin' },
      });

      if (!superAdminRole) {
        superAdminRole = await roleRepo.save(
          roleRepo.create({
            name: 'super_admin',
            description: 'Acesso total com bypass de permissoes',
            isSystem: true,
          }),
        );
      } else if (!superAdminRole.isSystem) {
        superAdminRole.isSystem = true;
        superAdminRole.description =
          superAdminRole.description ?? 'Acesso total com bypass de permissoes';
        await roleRepo.save(superAdminRole);
      }

      await permissionRepo.upsert(
        RBAC_MODULES.flatMap((module) =>
          RBAC_ACTIONS.map((action) => ({ module, action })),
        ),
        ['module', 'action'],
      );

      const permissions = await permissionRepo.find({
        where: {
          module: In([...RBAC_MODULES]),
          action: In([...RBAC_ACTIONS]),
        },
      });

      await manager
        .createQueryBuilder()
        .insert()
        .into('role_permissions')
        .values(
          permissions.map((permission) => ({
            role_id: superAdminRole.id,
            permission_id: permission.id,
          })),
        )
        .orIgnore()
        .execute();

      const existingSuperAdmins = await userRepo
        .createQueryBuilder('user')
        .innerJoin('user.roles', 'role', 'role.name = :roleName', {
          roleName: 'super_admin',
        })
        .where('user.deleted_at IS NULL')
        .getMany();

      const hasDifferentSuperAdmin = existingSuperAdmins.some(
        (user) => user.email.toLowerCase() !== dto.email,
      );
      if (hasDifferentSuperAdmin) {
        throw new ConflictException('Super admin already exists');
      }

      let created = false;
      let user = await userRepo.findOne({
        where: { email: dto.email },
        relations: { roles: true },
      });

      if (!user) {
        created = true;
        user = userRepo.create({
          name: dto.name.trim(),
          email: dto.email,
          passwordHash: await bcrypt.hash(dto.password, 12),
          isActive: true,
          emailVerifiedAt: new Date(),
          roles: [superAdminRole],
        });
      } else {
        user.name = dto.name.trim();
        user.passwordHash = await bcrypt.hash(dto.password, 12);
        user.isActive = true;
        user.emailVerifiedAt = user.emailVerifiedAt ?? new Date();
        const roles = user.roles ?? [];
        if (!roles.some((role) => role.id === superAdminRole.id)) {
          user.roles = [...roles, superAdminRole];
        }
      }

      const saved = await userRepo.save(user);

      await auditRepo.save(
        auditRepo.create({
          userId: saved.id,
          action: 'auth.bootstrap',
          resource: 'users',
          resourceId: saved.id,
          metadata: {
            email: saved.email,
            created,
            userAgent: context.userAgent,
          },
          ip: context.ip,
        }),
      );

      return {
        user: {
          id: saved.id,
          name: saved.name,
          email: saved.email,
          roles: ['super_admin'],
          created,
        },
      };
    });
  }

  private constantTimeTokenMatches(
    provided: string,
    expected: string,
  ): boolean {
    const providedHash = createHash('sha256').update(provided).digest();
    const expectedHash = createHash('sha256').update(expected).digest();
    return timingSafeEqual(providedHash, expectedHash);
  }
}
