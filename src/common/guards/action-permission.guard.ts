import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_ACTION_KEY } from '../decorators/require-action.decorator';

// Enforces the granular per-user permission overrides (UserPermission
// table). Default-allow: a key with no override, or override granted:true,
// is allowed. Only an explicit granted:false row blocks the action. ADMIN
// always bypasses this check - see jwt.strategy.ts, which skips building
// the permissions map entirely for ADMIN users.
@Injectable()
export class ActionPermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredKey = this.reflector.getAllAndOverride<string>(REQUIRED_ACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredKey) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role === 'ADMIN') return true;

    const permissions: Record<string, boolean> = user.permissions || {};
    if (permissions[requiredKey] === false) {
      throw new ForbiddenException(`You do not have permission to perform this action (${requiredKey})`);
    }

    return true;
  }
}
