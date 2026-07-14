import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Permission } from '../database/entities/system/permission.entity';
import { Role } from '../database/entities/system/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
  ) {}

  async list() {
    const roles = await this.roleRepo.find({
      relations: { permissions: true },
      order: { name: 'ASC' },
    });
    return roles.map((role) => this.mapRole(role));
  }

  async findById(id: string) {
    return this.mapRole(await this.getRoleOrThrow(id));
  }

  async create(dto: CreateRoleDto) {
    const name = this.parseName(dto.name);
    const existing = await this.roleRepo.findOne({ where: { name } });
    if (existing) throw new ConflictException('Papel ja cadastrado.');

    const role = this.roleRepo.create({
      name,
      description: this.parseOptionalString(dto.description, 255),
      isSystem: false,
      permissions: await this.getPermissions(dto.permissionIds ?? []),
    });

    return this.mapRole(await this.roleRepo.save(role));
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.getRoleOrThrow(id);
    if (dto.name !== undefined) {
      const name = this.parseName(dto.name);
      const existing = await this.roleRepo.findOne({ where: { name } });
      if (existing && existing.id !== id)
        throw new ConflictException('Papel ja cadastrado.');
      role.name = name;
    }
    if (dto.description !== undefined) {
      role.description = this.parseOptionalString(dto.description, 255);
    }
    return this.mapRole(await this.roleRepo.save(role));
  }

  async setPermissions(id: string, dto: UpdateRolePermissionsDto) {
    const role = await this.getRoleOrThrow(id);
    role.permissions = await this.getPermissions(dto.permissionIds);
    return this.mapRole(await this.roleRepo.save(role));
  }

  async remove(id: string): Promise<void> {
    const role = await this.getRoleOrThrow(id);
    if (role.isSystem) {
      throw new BadRequestException(
        'Papeis de sistema nao podem ser excluidos.',
      );
    }
    await this.roleRepo.delete(id);
  }

  async listPermissions() {
    const permissions = await this.permissionRepo.find({
      order: { module: 'ASC', action: 'ASC' },
    });
    return permissions.map((permission) => ({
      id: permission.id,
      module: permission.module,
      action: permission.action,
    }));
  }

  private async getRoleOrThrow(id: string): Promise<Role> {
    const role = await this.roleRepo.findOne({
      where: { id },
      relations: { permissions: true },
    });
    if (!role) throw new NotFoundException('Papel nao encontrado.');
    return role;
  }

  private async getPermissions(permissionIds: string[]): Promise<Permission[]> {
    if (!Array.isArray(permissionIds) || permissionIds.length === 0) return [];
    const uniqueIds = Array.from(new Set(permissionIds));
    const permissions = await this.permissionRepo.find({
      where: { id: In(uniqueIds) },
    });
    if (permissions.length !== uniqueIds.length) {
      throw new BadRequestException(
        'Uma ou mais permissoes nao foram encontradas.',
      );
    }
    return permissions;
  }

  private mapRole(role: Role) {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: (role.permissions ?? []).map((permission) => ({
        id: permission.id,
        module: permission.module,
        action: permission.action,
      })),
      createdAt: role.createdAt?.toISOString(),
      updatedAt: role.updatedAt?.toISOString(),
    };
  }

  private parseName(value: unknown): string {
    const name = this.parseRequiredString(value, 'name', 60).toLowerCase();
    if (!/^[a-z0-9_]+$/.test(name)) {
      throw new BadRequestException(
        'name deve conter apenas letras, numeros e underline.',
      );
    }
    return name;
  }

  private parseRequiredString(
    value: unknown,
    field: string,
    max: number,
  ): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${field} e obrigatorio.`);
    }
    const normalized = value.trim();
    if (normalized.length > max)
      throw new BadRequestException(`${field} excede ${max} caracteres.`);
    return normalized;
  }

  private parseOptionalString(value: unknown, max: number): string | null {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value !== 'string')
      throw new BadRequestException('description deve ser string.');
    const normalized = value.trim();
    if (normalized.length > max)
      throw new BadRequestException(`description excede ${max} caracteres.`);
    return normalized || null;
  }
}
