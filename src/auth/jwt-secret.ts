import { ConfigService } from '@nestjs/config';

const WEAK_JWT_SECRETS = new Set([
  'change-me',
  'change-me-access',
  'change-me-access-secret',
  'replace-with-at-least-32-random-characters',
  'secret',
  'jwt-secret',
]);

export function getRequiredJwtAccessSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_ACCESS_SECRET')?.trim();

  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET must be configured.');
  }

  if (secret.length < 32 || WEAK_JWT_SECRETS.has(secret.toLowerCase())) {
    throw new Error(
      'JWT_ACCESS_SECRET must be at least 32 characters and cannot use placeholder values.',
    );
  }

  return secret;
}
