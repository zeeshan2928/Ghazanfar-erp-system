import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { Prisma } from '@prisma/client';

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
  ) {
    try {
      return await this.prisma.attendance.create({
        data: {
          organizationId,
          employeeId,
          attendanceDate,
          status,
          hoursWorked: hoursWorked ? new Prisma.Decimal(hoursWorked) : undefined,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to record attendance: ${(error as Error).message}`);
      throw error;
    }
  }

  async getAttendanceHistory(
    organizationId: number,
    employeeId: number,
    startDate: Date,
    endDate: Date,
  ) {
    return this.prisma.attendance.findMany({
      where: {
        organizationId,
        employeeId,
        attendanceDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { attendanceDate: 'desc' },
    });
  }

  async getMonthlyAttendanceStats(organizationId: number, employeeId: number, month: number, year: number) {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 1);

    const records = await this.prisma.attendance.findMany({
      where: {
        organizationId,
        employeeId,
        attendanceDate: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    const present = records.filter(r => r.status === 'PRESENT').length;
    const absent = records.filter(r => r.status === 'ABSENT').length;
    const leave = records.filter(r => r.status === 'LEAVE').length;

    const total = records.length;
    return {
      month,
      year,
      total,
      present,
      absent,
      leave,
      attendancePercentage: total > 0 ? (present / total) * 100 : 0,
    };
  }

  async bulkUpdateAttendance(
    organizationId: number,
    updates: Array<{ employeeId: number; date: Date; status: string }>,
  ) {
    const results = [];
    for (const update of updates) {
      const existing = await this.prisma.attendance.findFirst({
        where: {
          organizationId,
          employeeId: update.employeeId,
          attendanceDate: update.date,
        },
      });

      if (existing) {
        const result = await this.prisma.attendance.update({
          where: { id: existing.id },
          data: { status: update.status },
        });
        results.push(result);
      } else {
        const result = await this.prisma.attendance.create({
          data: {
            organizationId,
            employeeId: update.employeeId,
            attendanceDate: update.date,
            status: update.status,
          },
        });
        results.push(result);
      }
    }
    return results;
  }

  async getOrganizationAttendanceStats(organizationId: number) {
    const records = await this.prisma.attendance.findMany({
      where: { organizationId },
      include: { employee: true },
    });

    const grouped = records.reduce(
      (acc, record) => {
        if (record.status === 'PRESENT') acc.present++;
        else if (record.status === 'ABSENT') acc.absent++;
        else if (record.status === 'LEAVE') acc.leave++;
        return acc;
      },
      { present: 0, absent: 0, leave: 0 },
    );

    return {
      total: records.length,
      ...grouped,
      attendancePercentage: records.length > 0 ? (grouped.present / records.length) * 100 : 0,
    };
  }
}
