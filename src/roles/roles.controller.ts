import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@ApiTags('Roles')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('roles')
  @RequirePermission('roles', 'view')
  list() {
    return this.rolesService.list();
  }

  @Get('roles/:id')
  @RequirePermission('roles', 'view')
  findById(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.rolesService.findById(id);
  }

  @Post('roles')
  @RequirePermission('roles', 'create')
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Patch('roles/:id')
  @RequirePermission('roles', 'update')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.update(id, dto);
  }

  @Patch('roles/:id/permissions')
  @RequirePermission('roles', 'update')
  setPermissions(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.rolesService.setPermissions(id, dto);
  }

  @Delete('roles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('roles', 'delete')
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.rolesService.remove(id);
  }

  @Get('permissions')
  listPermissions() {
    return this.rolesService.listPermissions();
  }
}
