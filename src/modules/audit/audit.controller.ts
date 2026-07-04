import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './services/audit.service';
import { JwtGuard } from '@common/guards/jwt.guard';
import { OrgContext } from '@common/decorators/org-context.decorator';
import { AuditAction } from '@prisma/client';

@Controller('audit-logs')
@UseGuards(JwtGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  /**
   * List audit logs with filters
   */
  @Get()
  async getAuditLogs(
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @OrgContext() orgContext?: any,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 20;

    const filters = {
      entity,
      entityId: entityId ? parseInt(entityId, 10) : undefined,
      userId: userId ? parseInt(userId, 10) : undefined,
      action: action ? (action as AuditAction) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    return this.auditService.getAuditLogs(orgContext.organizationId, filters, skipNum, takeNum);
  }

  /**
   * Get history for specific entity
   */
  @Get('entity/:entity/:id')
  async getEntityHistory(
    @Param('entity') entity: string,
    @Param('id') id: string,
    @OrgContext() orgContext?: any,
  ) {
    return this.auditService.getEntityHistory(orgContext.organizationId, entity, parseInt(id, 10));
  }

  /**
   * Get user's actions
   */
  @Get('user/:userId')
  async getUserAuditLog(
    @Param('userId') userId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @OrgContext() orgContext?: any,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 20;

    return this.auditService.getUserAuditLog(orgContext.organizationId, parseInt(userId, 10), skipNum, takeNum);
  }

  /**
   * Get changes summary for date range
   */
  @Get('summary')
  async getChangesSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @OrgContext() orgContext?: any,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const end = endDate ? new Date(endDate) : new Date();

    return this.auditService.getChangesSummary(orgContext.organizationId, start, end);
  }

  /**
   * Get top changed entities
   */
  @Get('reports/top-changes')
  async getTopChangedEntities(
    @Query('limit') limit?: string,
    @OrgContext() orgContext?: any,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.auditService.getTopChangedEntities(orgContext.organizationId, limitNum);
  }

  /**
   * Get user activity report
   */
  @Get('reports/user-activity')
  async getUserActivityReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @OrgContext() orgContext?: any,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.auditService.getUserActivityReport(orgContext.organizationId, start, end);
  }
}
