import { SetMetadata } from '@nestjs/common';
import { PermissionAction } from '../auth.types';

export const REQUIRE_PERMISSION_KEY = 'require_permission';

export interface RequiredPermission {
  module: string;
  action: PermissionAction;
}

export const RequirePermission = (module: string, action: PermissionAction) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, { module, action });
