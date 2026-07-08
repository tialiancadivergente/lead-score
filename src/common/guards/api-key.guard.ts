import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { API_KEY_ONLY_KEY } from '../../auth/decorators/api-key-only.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const forceApiKey = this.reflector.getAllAndOverride<boolean>(
      API_KEY_ONLY_KEY,
      [context.getHandler(), context.getClass()],
    );
    const enabled =
      this.config.get<string>('API_KEY_ENABLED', 'false').toLowerCase() ===
      'true';
    if (!enabled && !forceApiKey) return true;

    const expectedApiKey = this.config.get<string>('INTERNAL_API_KEY');
    if (!expectedApiKey) {
      throw new UnauthorizedException(
        'API key não configurada no servidor (INTERNAL_API_KEY).',
      );
    }

    const req = context.switchToHttp().getRequest<Request & { headers: any }>();
    const headerValue = req.headers?.['x-api-key'];
    const providedApiKey = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;

    if (
      typeof providedApiKey !== 'string' ||
      providedApiKey !== expectedApiKey
    ) {
      throw new UnauthorizedException('API key inválida.');
    }

    return true;
  }
}
