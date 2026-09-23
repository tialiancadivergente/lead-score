import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const TOKEN_PREFIX = 'oauth:v1';
const WEAK_ENCRYPTION_KEYS = new Set([
  'change-me',
  'replace-with-at-least-32-random-characters',
]);

@Injectable()
export class OAuthTokenEncryptionService {
  constructor(private readonly config: ConfigService) {}

  encryptToken(token: string | null | undefined): string | null {
    if (!token) return null;

    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.getKey(), iv);
    const ciphertext = Buffer.concat([
      cipher.update(token, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return [
      TOKEN_PREFIX,
      iv.toString('base64url'),
      tag.toString('base64url'),
      ciphertext.toString('base64url'),
    ].join(':');
  }

  decryptToken(token: string | null | undefined): string | null {
    if (!token) return null;
    if (!this.isEncryptedToken(token)) return token;

    const parts = token.split(':');
    if (parts.length !== 5) {
      throw new InternalServerErrorException(
        'Token OAuth criptografado em formato invalido.',
      );
    }

    const [, , ivValue, tagValue, ciphertextValue] = parts;
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.getKey(),
      Buffer.from(ivValue, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));

    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  isEncryptedToken(token: string | null | undefined): boolean {
    return typeof token === 'string' && token.startsWith(`${TOKEN_PREFIX}:`);
  }

  private getKey(): Buffer {
    const rawKey = this.config.get<string>('OAUTH_TOKEN_ENCRYPTION_KEY')?.trim();

    if (!rawKey) {
      throw new InternalServerErrorException(
        'OAUTH_TOKEN_ENCRYPTION_KEY deve estar configurada para criptografar tokens OAuth.',
      );
    }

    if (
      rawKey.length < 32 ||
      WEAK_ENCRYPTION_KEYS.has(rawKey.toLowerCase())
    ) {
      throw new InternalServerErrorException(
        'OAUTH_TOKEN_ENCRYPTION_KEY deve ter ao menos 32 caracteres e nao pode usar placeholder.',
      );
    }

    return createHash('sha256').update(rawKey, 'utf8').digest();
  }
}
