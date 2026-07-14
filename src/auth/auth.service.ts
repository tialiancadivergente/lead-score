import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { JwtPayload } from './auth.types';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PermissionsService } from './permissions.service';
import { PasswordReset } from '../database/entities/system/password-reset.entity';
import { RefreshToken } from '../database/entities/system/refresh-token.entity';
import { User } from '../database/entities/system/user.entity';

interface ClientContext {
  ip?: string;
  userAgent?: string;
}

interface LoginAttempt {
  count: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}

@Injectable()
export class AuthService {
  private readonly failedAttempts = new Map<string, LoginAttempt>();

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepo: Repository<PasswordReset>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async login(dto: LoginDto, context: ClientContext) {
    const email = this.parseEmail(dto.email);
    this.assertNotLocked(email);

    const user = await this.userRepo.findOne({
      where: { email, isActive: true },
      relations: { roles: { permissions: true } },
    });

    if (!user || user.deletedAt) {
      this.registerFailure(email);
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password ?? '',
      user.passwordHash,
    );
    if (!passwordMatches) {
      this.registerFailure(email);
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    this.failedAttempts.delete(email);
    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    const tokens = await this.issueTokens(user, context);
    return {
      ...tokens,
      user: await this.permissionsService.getAuthenticatedUser(user.id),
    };
  }

  async refresh(refreshToken: string, context: ClientContext) {
    const token = this.parseRequiredString(refreshToken, 'refreshToken');
    const stored = await this.refreshTokenRepo.findOne({
      where: {
        tokenHash: this.hashOpaqueToken(token),
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      relations: { user: { roles: { permissions: true } } },
    });

    if (!stored) {
      throw new UnauthorizedException('Refresh token invalido ou expirado.');
    }

    if (!stored.user.isActive || stored.user.deletedAt) {
      throw new UnauthorizedException('Usuario inativo.');
    }

    stored.revokedAt = new Date();
    await this.refreshTokenRepo.save(stored);
    const tokens = await this.issueTokens(stored.user, context);
    return {
      ...tokens,
      user: await this.permissionsService.getAuthenticatedUser(stored.userId),
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const token = this.parseRequiredString(refreshToken, 'refreshToken');
    const stored = await this.refreshTokenRepo.findOne({
      where: { tokenHash: this.hashOpaqueToken(token), revokedAt: IsNull() },
    });

    if (stored) {
      stored.revokedAt = new Date();
      await this.refreshTokenRepo.save(stored);
    }
  }

  async me(userId: string) {
    const user = await this.permissionsService.getAuthenticatedUser(userId);
    if (!user) throw new UnauthorizedException('Usuario nao encontrado.');
    return user;
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = this.parseEmail(dto.email);
    const user = await this.userRepo.findOne({
      where: { email, isActive: true },
    });

    if (user && !user.deletedAt) {
      const token = await this.createPasswordResetToken(user);
      if (this.config.get<string>('AUTH_LOG_RESET_TOKEN', 'false') === 'true') {
        console.warn(`Password reset token for ${email}: ${token}`);
      }
    }

    return { message: 'Se o email existir, enviaremos instrucoes para reset.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const token = this.parseRequiredString(dto.token, 'token');
    const newPassword = this.parsePassword(dto.newPassword);
    const stored = await this.passwordResetRepo.findOne({
      where: {
        tokenHash: this.hashOpaqueToken(token),
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      relations: { user: true },
    });

    if (!stored) {
      throw new BadRequestException('Token invalido ou expirado.');
    }

    stored.usedAt = new Date();
    stored.user.passwordHash = await this.hashPassword(newPassword);
    await this.userRepo.save(stored.user);
    await this.passwordResetRepo.save(stored);
    await this.revokeUserRefreshTokens(stored.userId);
    return { message: 'Senha alterada com sucesso.' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const currentPassword = this.parseRequiredString(
      dto.currentPassword,
      'currentPassword',
    );
    const newPassword = this.parsePassword(dto.newPassword);
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || user.deletedAt)
      throw new NotFoundException('Usuario nao encontrado.');

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Senha atual invalida.');
    }

    user.passwordHash = await this.hashPassword(newPassword);
    await this.userRepo.save(user);
    await this.revokeUserRefreshTokens(user.id);
    return { message: 'Senha alterada com sucesso.' };
  }

  async createPasswordResetToken(user: User): Promise<string> {
    const token = randomBytes(48).toString('base64url');
    await this.passwordResetRepo.save(
      this.passwordResetRepo.create({
        userId: user.id,
        tokenHash: this.hashOpaqueToken(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      }),
    );
    return token;
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  private async issueTokens(user: User, context: ClientContext) {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET', 'change-me-access'),
      expiresIn: this.config.get<string>(
        'JWT_ACCESS_EXPIRES_IN',
        '15m',
      ) as never,
    });
    const refreshToken = randomBytes(64).toString('base64url');
    const refreshTtlMs = this.parseDurationMs(
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      7 * 24 * 60 * 60 * 1000,
    );

    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        userId: user.id,
        tokenHash: this.hashOpaqueToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshTtlMs),
        ip: context.ip,
        userAgent: context.userAgent,
      }),
    );

    return { accessToken, refreshToken };
  }

  private async revokeUserRefreshTokens(userId: string): Promise<void> {
    await this.refreshTokenRepo.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  private registerFailure(email: string): void {
    const now = Date.now();
    const windowMs = 15 * 60 * 1000;
    const existing = this.failedAttempts.get(email);
    const attempt =
      !existing || now - existing.firstAttemptAt > windowMs
        ? { count: 0, firstAttemptAt: now }
        : existing;

    attempt.count += 1;
    if (attempt.count >= 5) {
      attempt.lockedUntil = now + windowMs;
    }
    this.failedAttempts.set(email, attempt);
  }

  private assertNotLocked(email: string): void {
    const attempt = this.failedAttempts.get(email);
    if (!attempt?.lockedUntil) return;
    if (attempt.lockedUntil <= Date.now()) {
      this.failedAttempts.delete(email);
      return;
    }
    throw new UnauthorizedException(
      'Muitas tentativas invalidas. Tente novamente em alguns minutos.',
    );
  }

  private parseDurationMs(value: string, fallback: number): number {
    const match = /^(\d+)([mhd])$/.exec(value);
    if (!match) return fallback;
    const amount = Number(match[1]);
    const unit = match[2];
    if (unit === 'm') return amount * 60 * 1000;
    if (unit === 'h') return amount * 60 * 60 * 1000;
    return amount * 24 * 60 * 60 * 1000;
  }

  private hashOpaqueToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseEmail(value: unknown): string {
    const email = this.parseRequiredString(value, 'email').toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('email invalido.');
    }
    return email;
  }

  private parsePassword(value: unknown): string {
    const password = this.parseRequiredString(value, 'newPassword');
    if (password.length < 8) {
      throw new BadRequestException('Senha deve ter ao menos 8 caracteres.');
    }
    return password;
  }

  private parseRequiredString(value: unknown, fieldName: string): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${fieldName} e obrigatorio.`);
    }
    return value.trim();
  }
}
