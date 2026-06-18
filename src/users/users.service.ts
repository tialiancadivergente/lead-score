import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { Role } from '../database/entities/system/role.entity';
import { User } from '../database/entities/system/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    private readonly authService: AuthService,
  ) {}

  async list(query: ListUsersQueryDto) {
    const page = this.parsePositiveInt(query.page, 1);
    const pageSize = Math.min(this.parsePositiveInt(query.pageSize, 20), 100);
    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .where('user.deleted_at IS NULL')
      .orderBy('user.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (query.search?.trim()) {
      qb.andWhere('(user.name ILIKE :search OR user.email ILIKE :search)', {
        search: `%${query.search.trim()}%`,
      });
    }
    if (query.roleId?.trim()) {
      qb.andWhere('role.id = :roleId', { roleId: query.roleId.trim() });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('user.is_active = :isActive', {
        isActive: this.parseBoolean(query.isActive, 'isActive'),
      });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items: items.map((user) => this.mapUser(user)), total, page, pageSize };
  }

  async findById(id: string) {
    return this.mapUser(await this.getUserOrThrow(id));
  }

  async create(dto: CreateUserDto) {
    const email = this.parseEmail(dto.email);
    const existing = await this.userRepo.findOne({ where: { email }, withDeleted: true });
    if (existing) throw new ConflictException('Email ja cadastrado.');

    const user = this.userRepo.create({
      name: this.parseRequiredString(dto.name, 'name', 120),
      email,
      passwordHash: await this.authService.hashPassword(this.parsePassword(dto.password)),
      isActive: true,
      roles: await this.getRoles(dto.roleIds ?? []),
    });

    return this.mapUser(await this.userRepo.save(user));
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.getUserOrThrow(id);
    if (dto.name !== undefined) user.name = this.parseRequiredString(dto.name, 'name', 120);
    if (dto.email !== undefined) {
      const email = this.parseEmail(dto.email);
      const existing = await this.userRepo.findOne({ where: { email }, withDeleted: true });
      if (existing && existing.id !== id) throw new ConflictException('Email ja cadastrado.');
      user.email = email;
    }
    if (dto.isActive !== undefined) user.isActive = this.parseBoolean(dto.isActive, 'isActive');
    return this.mapUser(await this.userRepo.save(user));
  }

  async setRoles(id: string, roleIds: string[]) {
    const user = await this.getUserOrThrow(id);
    user.roles = await this.getRoles(roleIds);
    return this.mapUser(await this.userRepo.save(user));
  }

  async setActive(id: string, isActive: boolean) {
    const user = await this.getUserOrThrow(id);
    user.isActive = isActive;
    return this.mapUser(await this.userRepo.save(user));
  }

  async forcePasswordReset(id: string) {
    const user = await this.getUserOrThrow(id);
    const resetToken = await this.authService.createPasswordResetToken(user);
    return { resetToken, expiresIn: '1h' };
  }

  async remove(id: string): Promise<void> {
    const result = await this.userRepo.softDelete(id);
    if (!result.affected) throw new NotFoundException('Usuario nao encontrado.');
  }

  private async getUserOrThrow(id: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: { roles: true },
    });
    if (!user || user.deletedAt) throw new NotFoundException('Usuario nao encontrado.');
    return user;
  }

  private async getRoles(roleIds: string[]): Promise<Role[]> {
    if (!Array.isArray(roleIds) || roleIds.length === 0) return [];
    const uniqueIds = Array.from(new Set(roleIds));
    const roles = await this.roleRepo.find({ where: { id: In(uniqueIds) } });
    if (roles.length !== uniqueIds.length) {
      throw new BadRequestException('Um ou mais papeis nao foram encontrados.');
    }
    return roles;
  }

  private mapUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      roles: (user.roles ?? []).map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
      })),
      createdAt: user.createdAt?.toISOString(),
      updatedAt: user.updatedAt?.toISOString(),
    };
  }

  private parsePositiveInt(value: unknown, fallback: number): number {
    const parsed = Number(value ?? fallback);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private parseEmail(value: unknown): string {
    const email = this.parseRequiredString(value, 'email', 180).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('email invalido.');
    }
    return email;
  }

  private parsePassword(value: unknown): string {
    const password = this.parseRequiredString(value, 'password', 255);
    if (password.length < 8) throw new BadRequestException('Senha deve ter ao menos 8 caracteres.');
    return password;
  }

  private parseRequiredString(value: unknown, field: string, max: number): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${field} e obrigatorio.`);
    }
    const normalized = value.trim();
    if (normalized.length > max) throw new BadRequestException(`${field} excede ${max} caracteres.`);
    return normalized;
  }

  private parseBoolean(value: unknown, field: string): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
    }
    throw new BadRequestException(`${field} deve ser boolean.`);
  }
}
