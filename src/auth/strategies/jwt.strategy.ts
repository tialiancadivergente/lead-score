import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../auth.types';
import { PermissionsService } from '../permissions.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly permissionsService: PermissionsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET', 'change-me-access'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.permissionsService.getAuthenticatedUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Usuario inativo ou nao encontrado.');
    }
    return user;
  }
}
