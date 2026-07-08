import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { API_KEY_ONLY_KEY } from '../decorators/api-key-only.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const apiKeyOnly = this.reflector.getAllAndOverride<boolean>(
      API_KEY_ONLY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (apiKeyOnly) return true;

    return super.canActivate(context);
  }
}
