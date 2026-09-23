import { ConfigService } from '@nestjs/config';
import { OAuthTokenEncryptionService } from './oauth-token-encryption.service';

describe('OAuthTokenEncryptionService', () => {
  const config = {
    get: jest.fn((key: string) =>
      key === 'OAUTH_TOKEN_ENCRYPTION_KEY'
        ? 'test-oauth-token-encryption-key-32-chars'
        : undefined,
    ),
  } as unknown as ConfigService;

  let service: OAuthTokenEncryptionService;

  beforeEach(() => {
    service = new OAuthTokenEncryptionService(config);
  });

  it('encrypts and decrypts OAuth tokens', () => {
    const token = 'google-access-token-secret';
    const encrypted = service.encryptToken(token);

    expect(encrypted).toBeTruthy();
    expect(encrypted).not.toContain(token);
    expect(service.isEncryptedToken(encrypted)).toBe(true);
    expect(service.decryptToken(encrypted)).toBe(token);
  });

  it('keeps legacy plaintext tokens readable for gradual migration', () => {
    const token = 'legacy-plaintext-token';

    expect(service.isEncryptedToken(token)).toBe(false);
    expect(service.decryptToken(token)).toBe(token);
  });
});
