import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';

/**
 * NOTE: this entire service is built against Prisma models that don't exist
 * anywhere in schema.prisma (LeaveManagement, Attendance, and the `employee`
 * relation used in getPendingLeaves' include). Confirmed via schema search on
 * 2026-07-06 - same "built against a schema that was never created" pattern
 * found across ~8 other places the same day (Notification, AuditLog,
 * UserRoleAssignment, FieldPermission, EmailTemplate, EmailLog, VendorInvoice,
 * InvoiceModification). LabourModule is registered in app.module.ts and has a
 * live controller, but nothing else in the codebase calls these methods.
 * Stubbed to log a warning and return safe defaults rather than crash -
 * needs a product/schema decision (add the HR models, or drop the feature)
 * before this can be made genuinely functional.
 */
@Injectable()
export class LeaveService {
  private readonly logger = new Logger(LeaveService.name);

  constructor(private prisma: PrismaService) {}

  async applyForLeave(
    organizationId: number,
    employeeId: number,
    leaveType: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    this.logger.warn('applyForLeave(): no LeaveManagement model exists in schema.prisma');
    return null;
  }

  async approveLeave(organizationId: number, leaveId: number, approved_by: number): Promise<any> {
    this.logger.warn('approveLeave(): no LeaveManagement model exists in schema.prisma');
    return null;
  }

  async rejectLeave(organizationId: number, leaveId: number): Promise<any> {
    this.logger.warn('rejectLeave(): no LeaveManagement model exists in schema.prisma');
    return null;
  }

  async getLeaveHistory(organizationId: number, employeeId: number): Promise<any[]> {
    this.logger.warn('getLeaveHistory(): no LeaveManagement model exists in schema.prisma');
    return [];
  }

  async getLeaveBalance(organizationId: number, employeeId: number) {
    this.logger.warn('getLeaveBalance(): no LeaveManagement model exists in schema.prisma');
    return {
      employeeId,
      totalApprovedLeaves: 0,
      totalDaysUsed: 0,
      leaves: [],
    };
  }

  async getPendingLeaves(organizationId: number): Promise<any[]> {
    this.logger.warn('getPendingLeaves(): no LeaveManagement model exists in schema.prisma');
    return [];
  }
}
