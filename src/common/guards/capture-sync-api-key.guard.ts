import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

// TODO: mover para env var/secret antes de expor isso amplamente.
const CAPTURE_SYNC_API_KEY = 'ald-capture-sync-temp-key-2026';

@Injectable()
export class CaptureSyncApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { headers: any }>();
    const headerValue = req.headers?.['x-sync-api-key'];
    const providedApiKey = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;

    if (
      typeof providedApiKey !== 'string' ||
      providedApiKey !== CAPTURE_SYNC_API_KEY
    ) {
      throw new UnauthorizedException('x-sync-api-key invalido ou ausente.');
    }

    return true;
  }
}
