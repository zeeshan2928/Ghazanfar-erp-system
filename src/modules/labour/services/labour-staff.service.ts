import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class LabourStaffService {
  private readonly logger = new Logger(LabourStaffService.name);

  constructor(private prisma: PrismaService) {}

  async getEmployeeStats(organizationId: number, employeeId: number) {
    try {
      const employee = await this.prisma.employee.findUnique({
        where: { id: employeeId },
        include: {
          Attendance: true,
          LeaveManagement: true,
        },
      });

      if (!employee) return null;

      const monthAttendance = await this.prisma.attendance.findMany({
        where: {
          employeeId,
          organizationId,
          attendanceDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
          },
        },
      });

      const leaves = await this.prisma.leaveManagement.findMany({
        where: { employeeId, organizationId },
      });

      return {
        employee,
        attendanceThisMonth: monthAttendance.length,
        totalLeaves: leaves.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get employee stats: ${(error as Error).message}`);
      throw error;
    }
  }

  async getOrganizationEmployees(organizationId: number) {
    return this.prisma.employee.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      include: {
        Attendance: true,
        LeaveManagement: true,
      },
    });
  }

  async updateEmployeeSalary(organizationId: number, employeeId: number, salary: number) {
    return this.prisma.employee.update({
      where: { id: employeeId },
      data: { salary },
    });
  }

  async getEmployeeLeaveBalance(organizationId: number, employeeId: number) {
    const leaves = await this.prisma.leaveManagement.findMany({
      where: {
        employeeId,
        organizationId,
        approvalStatus: 'APPROVED',
      },
    });

    return {
      employeeId,
      totalLeavesApproved: leaves.length,
      leaves,
    };
  }
}
