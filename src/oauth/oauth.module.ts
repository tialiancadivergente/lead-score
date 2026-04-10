import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OAuthConnection } from '../database/entities/integrations/oauth-connection.entity';
import { OAuthState } from '../database/entities/integrations/oauth-state.entity';
import { User } from '../database/entities/system/user.entity';
import { GoogleAdsOAuthService } from './google-ads-oauth.service';
import { MetaAdsOAuthService } from './meta-ads-oauth.service';
import { OauthController } from './oauth.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OAuthConnection, OAuthState, User])],
  controllers: [OauthController],
  providers: [GoogleAdsOAuthService, MetaAdsOAuthService],
  exports: [GoogleAdsOAuthService, MetaAdsOAuthService],
})
export class OauthModule {}
