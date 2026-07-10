import { SetMetadata } from '@nestjs/common';

export const REQUIRED_ACTION_KEY = 'requiredAction';

// Marks a route as gated by a specific permission key from
// src/common/config/permission-catalog.ts, e.g. @RequireAction('bills.delete').
// Enforced by ActionPermissionGuard.
export const RequireAction = (permissionKey: string) => SetMetadata(REQUIRED_ACTION_KEY, permissionKey);
