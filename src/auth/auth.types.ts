import { Request } from 'express';

export type PermissionAction = 'view' | 'create' | 'update' | 'delete';

export interface PermissionGroup {
  module: string;
  actions: PermissionAction[];
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: PermissionGroup[];
  isSuperAdmin: boolean;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export interface JwtPayload {
  sub: string;
  email: string;
}

export const RBAC_MODULES = [
  'dashboard',
  'launch_dashboard',
  'vendas_hotmart',
  'meta_ads',
  'google_ads',
  'lead_capture',
  'vote_campaigns',
  'launch',
  'pages',
  'season',
  'forms',
  'marketing_sync',
  'marketing_sync_config',
  'users',
  'roles',
  'copilot',
] as const;

export const RBAC_ACTIONS: PermissionAction[] = [
  'view',
  'create',
  'update',
  'delete',
];
