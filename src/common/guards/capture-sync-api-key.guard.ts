import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';

@Injectable()
export class CaptureSyncApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expectedApiKey = this.config.get<string>('CAPTURE_SYNC_API_KEY');
    if (!expectedApiKey) {
      throw new UnauthorizedException(
        'API key de sync nao configurada no servidor (CAPTURE_SYNC_API_KEY).',
      );
    }

    const req = context.switchToHttp().getRequest<Request & { headers: any }>();
    const headerValue = req.headers?.['x-sync-api-key'];
    const providedApiKey = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;

    if (
      typeof providedApiKey !== 'string' ||
      !this.constantTimeTokenMatches(providedApiKey, expectedApiKey)
    ) {
      throw new UnauthorizedException('x-sync-api-key invalido ou ausente.');
    }

    return true;
  }

  private constantTimeTokenMatches(provided: string, expected: string): boolean {
    const providedHash = createHash('sha256').update(provided).digest();
    const expectedHash = createHash('sha256').update(expected).digest();
    return timingSafeEqual(providedHash, expectedHash);
  }
}
