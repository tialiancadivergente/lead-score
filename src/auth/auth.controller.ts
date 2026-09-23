import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { AuthenticatedUser } from './auth.types';
import {
  clearAuthCookies,
  getAccessTokenFromRequest,
  getCookie,
  REFRESH_TOKEN_COOKIE,
  setAuthCookies,
} from './auth-cookies';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { AuthService } from './auth.service';
import { BootstrapService } from './bootstrap.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { BootstrapDto } from './dto/bootstrap.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { getClientIp } from '../common/security/client-ip';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly bootstrapService: BootstrapService,
    private readonly config: ConfigService,
    private readonly authRateLimit: AuthRateLimitService,
  ) {}

  @Post('bootstrap')
  @ApiExcludeEndpoint()
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  bootstrap(
    @Body() dto: BootstrapDto,
    @Headers('x-bootstrap-token') token: string | undefined,
    @Req() req: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    const ip = this.getRequestIp(req);
    return this.bootstrapService.bootstrap(dto, { token, ip, userAgent });
  }

  @Post('login')
  @Throttle({ default: { limit: 50, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Headers('user-agent') userAgent?: string,
  ) {
    const ip = this.getRequestIp(req);
    await this.assertAuthRateLimit(res, {
      action: 'login',
      ip,
      subject: dto.email,
      limit: 5,
      ttlMs: 60_000,
    });
    const result = await this.authService.login(dto, { ip, userAgent });
    setAuthCookies(res, result, this.config);
    return { user: result.user };
  }

  @Post('refresh')
  @Throttle({ default: { limit: 50, ttl: 60_000 } })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Headers('user-agent') userAgent?: string,
  ) {
    const ip = this.getRequestIp(req);
    await this.assertAuthRateLimit(res, {
      action: 'refresh',
      ip,
      limit: 10,
      ttlMs: 60_000,
    });
    const refreshToken = getCookie(req, REFRESH_TOKEN_COOKIE);
    const result = await this.authService.refresh(refreshToken, {
      ip,
      userAgent,
    });
    setAuthCookies(res, result, this.config);
    return { user: result.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Headers('user-agent') userAgent?: string,
  ): Promise<void> {
    const ip = this.getRequestIp(req);
    const refreshToken = getCookie(req, REFRESH_TOKEN_COOKIE);
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    } else {
      await this.authService.logoutByAccessToken(
        getAccessTokenFromRequest(req),
        { ip, userAgent },
      );
    }
    clearAuthCookies(res);
  }

  @Get('me')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.id);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 50, ttl: 60_000 } })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = this.getRequestIp(req);
    await this.assertAuthRateLimit(res, {
      action: 'forgot-password',
      ip,
      subject: dto.email,
      limit: 5,
      ttlMs: 60_000,
    });
    return this.authService.forgotPassword(dto, { ip });
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('change-password')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, dto);
  }

  private async assertAuthRateLimit(
    res: Response,
    options: {
      action: string;
      ip?: string;
      subject?: string;
      limit: number;
      ttlMs: number;
    },
  ): Promise<void> {
    const retryAfter = await this.authRateLimit.check(options);
    if (retryAfter <= 0) return;

    res.setHeader('Retry-After', String(retryAfter));
    throw new HttpException(
      `Muitas tentativas. Tente novamente em ${retryAfter} segundos.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private getRequestIp(req: Request): string {
    return getClientIp(req, this.config);
  }
}
