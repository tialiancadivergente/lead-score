import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { getCookie, ACCESS_TOKEN_COOKIE } from '../auth-cookies';
import { JwtPayload } from '../auth.types';
import { getRequiredJwtAccessSecret } from '../jwt-secret';
import { PermissionsService } from '../permissions.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly permissionsService: PermissionsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => getCookie(req, ACCESS_TOKEN_COOKIE) ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: getRequiredJwtAccessSecret(config),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.permissionsService.getAuthenticatedUser(
      payload.sub,
    );
    if (!user) {
      throw new UnauthorizedException('Usuario inativo ou nao encontrado.');
    }
    return user;
  }
}
