import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '@modules/permissions/services/permissions.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<string>(
      'requiredPermission',
      context.getHandler(),
    );
    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = (request as any).user;
    const orgContext = (request as any).orgContext;

    if (!user || !orgContext) {
      throw new ForbiddenException('User or organization context not found');
    }

    const [entity, action] = requiredPermission.split(':');

    const canPerform = await this.permissionsService.canPerformAction(
      orgContext.organizationId,
      user.sub || user.id,
      entity,
      action,
    );

    if (!canPerform) {
      throw new ForbiddenException(`Permission denied: ${requiredPermission}`);
    }

    return true;
  }
}
