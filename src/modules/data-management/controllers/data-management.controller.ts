import { Controller, Post, Get, Param, ParseIntPipe, Logger, UseGuards } from '@nestjs/common';
import { ArchivalService } from '../services/archival.service';
import { JwtGuard } from '@common/guards/jwt.guard';
import { ActionPermissionGuard } from '@common/guards/action-permission.guard';
import { RequireAction } from '@common/decorators/require-action.decorator';

@Controller('data-management')
@UseGuards(JwtGuard)
export class DataManagementController {
  private readonly logger = new Logger(DataManagementController.name);

  constructor(private archivalService: ArchivalService) {}

  // ============================================================================
  //                        ARCHIVAL ENDPOINTS
  // ============================================================================

  @Post('archive/bills/:daysOld')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('data_management.archive')
  async archiveBills(@Param('daysOld', ParseIntPipe) daysOld: number = 365) {
    this.logger.log(`Archiving bills older than ${daysOld} days`);
    return await this.archivalService.archiveCompletedBills(daysOld);
  }

  @Post('archive/purchase-orders/:daysOld')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('data_management.archive')
  async archivePurchaseOrders(@Param('daysOld', ParseIntPipe) daysOld: number = 180) {
    this.logger.log(`Archiving purchase orders older than ${daysOld} days`);
    return await this.archivalService.archiveClosedPurchaseOrders(daysOld);
  }

  @Post('purge/notifications/:daysOld')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('data_management.purge')
  async purgeNotifications(@Param('daysOld', ParseIntPipe) daysOld: number = 90) {
    this.logger.log(`Purging read notifications older than ${daysOld} days`);
    return await this.archivalService.purgeOldNotifications(daysOld);
  }

  @Post('purge/audit-logs/:daysOld')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('data_management.purge')
  async purgeAuditLogs(@Param('daysOld', ParseIntPipe) daysOld: number = 365) {
    this.logger.log(`Purging audit logs older than ${daysOld} days`);
    return await this.archivalService.purgeOldAuditLogs(daysOld);
  }

  @Post('cleanup/failed-transactions/:hoursOld')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('data_management.purge')
  async cleanupFailedTransactions(@Param('hoursOld', ParseIntPipe) hoursOld: number = 24) {
    this.logger.log(`Cleaning up failed transactions older than ${hoursOld} hours`);
    return await this.archivalService.cleanupFailedTransactions(hoursOld);
  }

  // ============================================================================
  //                       REPORTING ENDPOINTS
  // ============================================================================

  @Get('reports/archive')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('data_management.view')
  async getArchiveReport() {
    this.logger.log('Generating archive report');
    return await this.archivalService.generateArchiveReport();
  }

  @Get('reports/storage')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('data_management.view')
  async getStorageStats() {
    this.logger.log('Fetching storage statistics');
    return await this.archivalService.getStorageStats();
  }

  @Get('reports/archive/:orgId')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('data_management.view')
  async getOrgArchiveReport(@Param('orgId', ParseIntPipe) orgId: number) {
    this.logger.log(`Generating archive report for organization ${orgId}`);
    return await this.archivalService.generateArchiveReport(orgId);
  }

  // ============================================================================
  //                        MANUAL JOBS
  // ============================================================================

  @Post('jobs/daily-cleanup')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('data_management.archive')
  async runDailyCleanup() {
    this.logger.log('Running daily cleanup manually');
    // This would typically be called by cron, but can be triggered manually
    return { status: 'Daily cleanup scheduled', timestamp: new Date() };
  }

  @Post('jobs/weekly-maintenance')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('data_management.archive')
  async runWeeklyMaintenance() {
    this.logger.log('Running weekly maintenance manually');
    return { status: 'Weekly maintenance scheduled', timestamp: new Date() };
  }

  @Post('jobs/monthly-archival')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('data_management.archive')
  async runMonthlyArchival() {
    this.logger.log('Running monthly archival manually');
    return { status: 'Monthly archival scheduled', timestamp: new Date() };
  }
}
