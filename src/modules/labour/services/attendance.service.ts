import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';

/**
 * NOTE: this entire service is built against an Attendance Prisma model (and
 * an `employee` relation) that doesn't exist anywhere in schema.prisma -
 * same pattern as leave.service.ts (see its docstring for full context).
 * Stubbed to log a warning and return safe defaults rather than crash.
 */
@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(private prisma: PrismaService) {}

  async recordAttendance(
    organizationId: number,
    employeeId: number,
    attendanceDate: Date,
    status: string,
    hoursWorked?: number,
  ): Promise<any> {
    this.logger.warn('recordAttendance(): no Attendance model exists in schema.prisma');
    return null;
  }

  async getAttendanceHistory(
    organizationId: number,
    employeeId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    this.logger.warn('getAttendanceHistory(): no Attendance model exists in schema.prisma');
    return [];
  }

  async getMonthlyAttendanceStats(
    organizationId: number,
    employeeId: number,
    month: number,
    year: number,
  ) {
    this.logger.warn('getMonthlyAttendanceStats(): no Attendance model exists in schema.prisma');
    return {
      month,
      year,
      total: 0,
      present: 0,
      absent: 0,
      leave: 0,
      attendancePercentage: 0,
    };
  }

  async bulkUpdateAttendance(
    organizationId: number,
    updates: Array<{ employeeId: number; date: Date; status: string }>,
  ): Promise<any[]> {
    this.logger.warn('bulkUpdateAttendance(): no Attendance model exists in schema.prisma');
    return [];
  }

  async getOrganizationAttendanceStats(organizationId: number) {
    this.logger.warn(
      'getOrganizationAttendanceStats(): no Attendance model exists in schema.prisma',
    );
    return {
      total: 0,
      present: 0,
      absent: 0,
      leave: 0,
      attendancePercentage: 0,
    };
  }
}
