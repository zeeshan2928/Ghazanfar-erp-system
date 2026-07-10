import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  HttpStatus,
  HttpCode,
  ForbiddenException,
  ParseIntPipe,
} from '@nestjs/common';
import { PermissionsService } from './services/permissions.service';
import { UserRole } from '@prisma/client';
import { JwtGuard } from '@common/guards/jwt.guard';
import { OrgContext } from '@common/decorators/org-context.decorator';

@Controller('permissions')
@UseGuards(JwtGuard)
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  /**
   * Get user's permissions summary
   */
  @Get('user/:userId')
  async getUserPermissions(@Param('userId') userId: string, @OrgContext() orgContext?: any) {
    return this.permissionsService.getPermissionsSummary(
      orgContext.organizationId,
      parseInt(userId, 10),
    );
  }

  /**
   * Get entity permissions for current user
   */
  @Get('entity/:entity')
  async getEntityPermissions(@Param('entity') entity: string, @OrgContext() orgContext?: any) {
    const role = await this.permissionsService.getUserRole(
      orgContext.organizationId,
      orgContext.userId,
    );
    const readableFields = await this.permissionsService.getReadableFields(
      orgContext.organizationId,
      orgContext.userId,
      entity,
    );
    const writableFields = await this.permissionsService.getWritableFields(
      orgContext.organizationId,
      orgContext.userId,
      entity,
    );
    const entityPermissions = this.permissionsService.getEntityPermissionsForRole(role, entity);

    return {
      entity,
      role,
      entityPermissions,
      readableFields,
      writableFields,
    };
  }

  /**
   * Check permission (field validation)
   */
  @Post('check')
  @HttpCode(HttpStatus.OK)
  async checkPermission(
    @Body() { entity, action, field }: { entity: string; action?: string; field?: string },
    @OrgContext() orgContext?: any,
  ) {
    let hasPermission = true;
    let reason = '';

    if (action) {
      hasPermission = await this.permissionsService.canPerformAction(
        orgContext.organizationId,
        orgContext.userId,
        entity,
        action,
      );
      reason = `Permission ${action} on ${entity}`;
    }

    if (field) {
      hasPermission = await this.permissionsService.canReadField(
        orgContext.organizationId,
        orgContext.userId,
        entity,
        field,
      );
      reason = `Read access to ${field} on ${entity}`;
    }

    return { hasPermission, reason };
  }

  /**
   * Get role's permissions
   */
  @Get('role/:role')
  async getRolePermissions(@Param('role') role: string) {
    const userRole = role.toUpperCase() as UserRole;
    return this.permissionsService.getEntityPermissionsForRole(userRole, '*');
  }

  /**
   * Assign role to user (Admin only)
   */
  @Post('assign-role')
  @HttpCode(HttpStatus.OK)
  async assignRole(
    @Body() { userId, role }: { userId: number; role: UserRole },
    @OrgContext() orgContext?: any,
  ) {
    // Verify caller is admin
    const callerRole = await this.permissionsService.getUserRole(
      orgContext.organizationId,
      orgContext.userId,
    );
    if (callerRole !== UserRole.ADMIN) {
      throw new Error('Only admins can assign roles');
    }

    return this.permissionsService.assignRole(orgContext.organizationId, userId, role);
  }

  /**
   * Validate update data (check for restricted fields)
   */
  @Post('validate-update')
  @HttpCode(HttpStatus.OK)
  async validateUpdateData(
    @Body() { entity, data }: { entity: string; data: any },
    @OrgContext() orgContext?: any,
  ) {
    const restrictedFields = await this.permissionsService.validateUpdateData(
      orgContext.organizationId,
      orgContext.userId,
      entity,
      data,
    );

    return {
      isValid: restrictedFields.length === 0,
      restrictedFields,
    };
  }

  // --- Real, enforced, DB-backed granular permission system ---

  @Get('catalog')
  getCatalog() {
    return this.permissionsService.getPermissionCatalog();
  }

  @Get('user/:userId/overrides')
  async getUserOverrides(
    @Param('userId', ParseIntPipe) userId: number,
    @OrgContext() orgContext?: any,
  ) {
    return this.permissionsService.getUserPermissionOverrides(orgContext.organizationId, userId);
  }

  @Put('user/:userId/overrides')
  async setUserOverrides(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() { overrides }: { overrides: { key: string; granted: boolean }[] },
    @OrgContext() orgContext?: any,
  ) {
    if (orgContext.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only an admin can set permission overrides');
    }
    return this.permissionsService.setUserPermissionOverrides(
      orgContext.organizationId,
      userId,
      overrides,
    );
  }

  @Get('override-stats')
  async getOverrideStats(@OrgContext() orgContext?: any) {
    return this.permissionsService.getPermissionOverrideStats(orgContext.organizationId);
  }
}
