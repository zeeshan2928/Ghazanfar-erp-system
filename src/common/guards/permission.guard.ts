import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '@modules/permissions/services/permissions.service';
import { AuditService } from '@modules/audit/services/audit.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  // private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
    private auditService: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<string>('requiredPermission', context.getHandler());
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

    const canPerform = await this.permissionsService.canPerformAction(orgContext.organizationId, user.sub || user.id, entity, action);

    if (!canPerform) {
      // Log permission denial
      await this.auditService.logCreate(
        orgContext.organizationId,
        'PermissionDenial',
        0,
        { entity, action, requiredPermission },
        user.sub || user.id,
        request.ip,
        request.get('user-agent'),
      );

      throw new ForbiddenException(`Permission denied: ${requiredPermission}`);
    }

    return true;
  }
}
