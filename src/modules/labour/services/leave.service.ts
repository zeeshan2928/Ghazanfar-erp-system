import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';

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
  ) {
    try {
      const daysUsed = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      return await this.prisma.leaveManagement.create({
        data: {
          organizationId,
          employeeId,
          leaveType,
          startDate,
          endDate,
          daysUsed,
          approvalStatus: 'PENDING',
        },
      });
    } catch (error) {
      this.logger.error(`Failed to apply for leave: ${(error as Error).message}`);
      throw error;
    }
  }

  async approveLeave(organizationId: number, leaveId: number, approvedBy: number) {
    try {
      const leave = await this.prisma.leaveManagement.update({
        where: { id: leaveId },
        data: {
          approvalStatus: 'APPROVED',
          approvedBy,
        },
      });

      if (leave.employeeId && leave.startDate && leave.endDate) {
        await this.markLeaveAttendance(organizationId, leave.employeeId, leave.startDate, leave.endDate);
      }

      return leave;
    } catch (error) {
      this.logger.error(`Failed to approve leave: ${(error as Error).message}`);
      throw error;
    }
  }

  async rejectLeave(organizationId: number, leaveId: number) {
    return this.prisma.leaveManagement.update({
      where: { id: leaveId },
      data: { approvalStatus: 'REJECTED' },
    });
  }

  async getLeaveHistory(organizationId: number, employeeId: number) {
    return this.prisma.leaveManagement.findMany({
      where: { organizationId, employeeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLeaveBalance(organizationId: number, employeeId: number) {
    const leaves = await this.prisma.leaveManagement.findMany({
      where: {
        organizationId,
        employeeId,
        approvalStatus: 'APPROVED',
      },
    });

    const totalDays = leaves.reduce((sum, leave) => sum + (leave.daysUsed || 0), 0);

    return {
      employeeId,
      totalApprovedLeaves: leaves.length,
      totalDaysUsed: totalDays,
      leaves,
    };
  }

  async getPendingLeaves(organizationId: number) {
    return this.prisma.leaveManagement.findMany({
      where: {
        organizationId,
        approvalStatus: 'PENDING',
      },
      include: { employee: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async markLeaveAttendance(organizationId: number, employeeId: number, startDate: Date, endDate: Date) {
    const current = new Date(startDate);

    while (current <= endDate) {
      const existing = await this.prisma.attendance.findFirst({
        where: {
          organizationId,
          employeeId,
          attendanceDate: current,
        },
      });

      if (existing) {
        await this.prisma.attendance.update({
          where: { id: existing.id },
          data: { status: 'LEAVE' },
        });
      } else {
        await this.prisma.attendance.create({
          data: {
            organizationId,
            employeeId,
            attendanceDate: current,
            status: 'LEAVE',
          },
        });
      }

      current.setDate(current.getDate() + 1);
    }
  }
}
