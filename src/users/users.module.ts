import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Role } from '../database/entities/system/role.entity';
import { User } from '../database/entities/system/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([User, Role])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
