import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogModule } from '../audit/audit-log.module';
import { AuthModule } from '../auth/auth.module';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { OAuthConnection } from '../database/entities/integrations/oauth-connection.entity';
import { OAuthState } from '../database/entities/integrations/oauth-state.entity';
import { User } from '../database/entities/system/user.entity';
import { GoogleAdsOAuthService } from './google-ads-oauth.service';
import { MetaAdsOAuthService } from './meta-ads-oauth.service';
import { OauthController } from './oauth.controller';
import { OAuthTokenEncryptionService } from './oauth-token-encryption.service';

@Module({
  imports: [
    AuthModule,
    AuditLogModule,
    TypeOrmModule.forFeature([OAuthConnection, OAuthState, User]),
  ],
  controllers: [OauthController],
  providers: [
    GoogleAdsOAuthService,
    MetaAdsOAuthService,
    OAuthTokenEncryptionService,
    ApiKeyGuard,
  ],
  exports: [GoogleAdsOAuthService, MetaAdsOAuthService],
})
export class OauthModule {}
