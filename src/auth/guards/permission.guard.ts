import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  REQUIRE_PERMISSION_KEY,
  RequiredPermission,
} from '../decorators/require-permission.decorator';
import { API_KEY_ONLY_KEY } from '../decorators/api-key-only.decorator';
import { AuthenticatedRequest } from '../auth.types';
import { PermissionsService } from '../permissions.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const apiKeyOnly = this.reflector.getAllAndOverride<boolean>(
      API_KEY_ONLY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (apiKeyOnly) return true;

    const required = this.reflector.getAllAndOverride<RequiredPermission>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (
      user &&
      this.permissionsService.hasPermission(user, required.module, required.action)
    ) {
      return true;
    }

    throw new ForbiddenException(
      `Missing permission ${required.module}:${required.action}`,
    );
  }
}
