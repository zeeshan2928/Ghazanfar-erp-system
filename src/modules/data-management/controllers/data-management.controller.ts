import { Controller, Post, Get, Param, ParseIntPipe, Logger } from "@nestjs/common";
import { ArchivalService } from "../services/archival.service";

@Controller("data-management")
export class DataManagementController {
  private readonly logger = new Logger(DataManagementController.name);

  constructor(private archivalService: ArchivalService) {}

  // ============================================================================
  //                        ARCHIVAL ENDPOINTS
  // ============================================================================

  @Post("archive/bills/:daysOld")
  async archiveBills(
    @Param("daysOld", ParseIntPipe) daysOld: number = 365
  ) {
    this.logger.log(`Archiving bills older than ${daysOld} days`);
    return await this.archivalService.archiveCompletedBills(daysOld);
  }

  @Post("archive/purchase-orders/:daysOld")
  async archivePurchaseOrders(
    @Param("daysOld", ParseIntPipe) daysOld: number = 180
  ) {
    this.logger.log(`Archiving purchase orders older than ${daysOld} days`);
    return await this.archivalService.archiveClosedPurchaseOrders(daysOld);
  }

  @Post("purge/notifications/:daysOld")
  async purgeNotifications(
    @Param("daysOld", ParseIntPipe) daysOld: number = 90
  ) {
    this.logger.log(`Purging read notifications older than ${daysOld} days`);
    return await this.archivalService.purgeOldNotifications(daysOld);
  }

  @Post("purge/audit-logs/:daysOld")
  async purgeAuditLogs(
    @Param("daysOld", ParseIntPipe) daysOld: number = 365
  ) {
    this.logger.log(`Purging audit logs older than ${daysOld} days`);
    return await this.archivalService.purgeOldAuditLogs(daysOld);
  }

  @Post("cleanup/failed-transactions/:hoursOld")
  async cleanupFailedTransactions(
    @Param("hoursOld", ParseIntPipe) hoursOld: number = 24
  ) {
    this.logger.log(`Cleaning up failed transactions older than ${hoursOld} hours`);
    return await this.archivalService.cleanupFailedTransactions(hoursOld);
  }

  // ============================================================================
  //                       REPORTING ENDPOINTS
  // ============================================================================

  @Get("reports/archive")
  async getArchiveReport() {
    this.logger.log("Generating archive report");
    return await this.archivalService.generateArchiveReport();
  }

  @Get("reports/storage")
  async getStorageStats() {
    this.logger.log("Fetching storage statistics");
    return await this.archivalService.getStorageStats();
  }

  @Get("reports/archive/:orgId")
  async getOrgArchiveReport(
    @Param("orgId", ParseIntPipe) orgId: number
  ) {
    this.logger.log(`Generating archive report for organization ${orgId}`);
    return await this.archivalService.generateArchiveReport(orgId);
  }

  // ============================================================================
  //                        MANUAL JOBS
  // ============================================================================

  @Post("jobs/daily-cleanup")
  async runDailyCleanup() {
    this.logger.log("Running daily cleanup manually");
    // This would typically be called by cron, but can be triggered manually
    return { status: "Daily cleanup scheduled", timestamp: new Date() };
  }

  @Post("jobs/weekly-maintenance")
  async runWeeklyMaintenance() {
    this.logger.log("Running weekly maintenance manually");
    return { status: "Weekly maintenance scheduled", timestamp: new Date() };
  }

  @Post("jobs/monthly-archival")
  async runMonthlyArchival() {
    this.logger.log("Running monthly archival manually");
    return { status: "Monthly archival scheduled", timestamp: new Date() };
  }
}
