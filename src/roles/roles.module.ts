import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Permission } from '../database/entities/system/permission.entity';
import { Role } from '../database/entities/system/role.entity';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Role, Permission])],
  controllers: [RolesController],
  providers: [RolesService],
})
export class RolesModule {}
