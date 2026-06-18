import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionGuard } from './guards/permission.guard';
import { PermissionsService } from './permissions.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PasswordReset } from '../database/entities/system/password-reset.entity';
import { RefreshToken } from '../database/entities/system/refresh-token.entity';
import { User } from '../database/entities/system/user.entity';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.register({}),
    TypeOrmModule.forFeature([User, RefreshToken, PasswordReset]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PermissionsService,
    JwtStrategy,
    JwtAuthGuard,
    PermissionGuard,
  ],
  exports: [AuthService, PermissionsService, JwtAuthGuard, PermissionGuard],
})
export class AuthModule {}
