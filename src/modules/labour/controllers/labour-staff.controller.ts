import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtGuard } from '@common/guards/jwt.guard';
import { OrgContext } from '@common/decorators/org-context.decorator';
import { LabourStaffService } from '../services/labour-staff.service';
import { AttendanceService } from '../services/attendance.service';
import { LeaveService } from '../services/leave.service';
import { BonusCalculationService } from '../services/bonus-calculation.service';

@Controller('labour')
@UseGuards(JwtGuard)
export class LabourStaffController {
  private readonly logger = new Logger(LabourStaffController.name);

  constructor(
    private readonly labourStaffService: LabourStaffService,
    private readonly attendanceService: AttendanceService,
    private readonly leaveService: LeaveService,
    private readonly bonusService: BonusCalculationService,
  ) {}

  // ==================== STAFF MANAGEMENT ====================

  @Post('staff')
  async registerStaff(
    @Body()
    data: {
      organizationId: number;
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      department: string;
      position: string;
      salary: number;
    },
  ) {
    try {
      const employee = await this.labourStaffService.getOrganizationEmployees(data.organizationId);

      return {
        status: 'success',
        message: 'Staff member registered successfully',
        data: employee,
      };
    } catch (error) {
      this.logger.error(`Error registering staff: ${(error as Error).message}`);
      throw new HttpException(
        `Failed to register staff: ${(error as Error).message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('staff/:organizationId')
  async getOrganizationStaff(@Param('organizationId') organizationId: string) {
    try {
      const staff = await this.labourStaffService.getOrganizationEmployees(parseInt(organizationId));

      return {
        status: 'success',
        data: staff,
        count: staff.length,
      };
    } catch (error) {
      this.logger.error(`Error fetching staff: ${(error as Error).message}`);
      throw new HttpException(
        'Failed to fetch staff members',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('staff/:organizationId/:employeeId')
  async getStaffDetails(
    @Param('organizationId') organizationId: string,
    @Param('employeeId') employeeId: string,
  ) {
    try {
      const stats = await this.labourStaffService.getEmployeeStats(
        parseInt(organizationId),
        parseInt(employeeId),
      );

      if (!stats) {
        throw new HttpException('Staff member not found', HttpStatus.NOT_FOUND);
      }

      return {
        status: 'success',
        data: stats,
      };
    } catch (error) {
      this.logger.error(`Error fetching staff details: ${(error as Error).message}`);
      throw new HttpException(
        'Failed to fetch staff details',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('staff/:employeeId')
  async updateStaff(
    @Param('employeeId') employeeId: string,
    @Body() data: { salary?: number },
    @OrgContext() orgContext?: any,
  ) {
    try {
      if (data.salary) {
        await this.labourStaffService.updateEmployeeSalary(
          orgContext.organizationId,
          parseInt(employeeId),
          data.salary,
        );
      }

      return {
        status: 'success',
        message: 'Staff member updated successfully',
      };
    } catch (error) {
      this.logger.error(`Error updating staff: ${(error as Error).message}`);
      throw new HttpException(
        'Failed to update staff member',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ==================== ATTENDANCE MANAGEMENT ====================

  @Post('attendance/check-in')
  async recordCheckIn(
    @Body()
    data: {
      organizationId: number;
      employeeId: number;
      date: string;
    },
  ) {
    try {
      const attendance = await this.attendanceService.recordAttendance(
        data.organizationId,
        data.employeeId,
        new Date(data.date),
        'PRESENT',
      );

      return {
        status: 'success',
        message: 'Check-in recorded',
        data: attendance,
      };
    } catch (error) {
      this.logger.error(`Error recording check-in: ${(error as Error).message}`);
      throw new HttpException(
        'Failed to record check-in',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('attendance/:organizationId')
  async getAttendance(
    @Param('organizationId') organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    try {
      const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const end = endDate ? new Date(endDate) : new Date();

      if (employeeId) {
        const records = await this.attendanceService.getAttendanceHistory(
          parseInt(organizationId),
          parseInt(employeeId),
          start,
          end,
        );

        return {
          status: 'success',
          data: records,
          count: records.length,
        };
      }

      const stats = await this.attendanceService.getOrganizationAttendanceStats(parseInt(organizationId));

      return {
        status: 'success',
        data: stats,
      };
    } catch (error) {
      this.logger.error(`Error fetching attendance: ${(error as Error).message}`);
      throw new HttpException(
        'Failed to fetch attendance records',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('attendance/:organizationId/:employeeId/monthly')
  async getMonthlyAttendance(
    @Param('organizationId') organizationId: string,
    @Param('employeeId') employeeId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    try {
      const stats = await this.attendanceService.getMonthlyAttendanceStats(
        parseInt(organizationId),
        parseInt(employeeId),
        parseInt(month),
        parseInt(year),
      );

      return {
        status: 'success',
        data: stats,
      };
    } catch (error) {
      this.logger.error(`Error fetching monthly attendance: ${(error as Error).message}`);
      throw new HttpException(
        'Failed to fetch monthly attendance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('attendance/bulk-update')
  async bulkUpdateAttendance(
    @Body()
    data: {
      organizationId: number;
      updates: Array<{ employeeId: number; date: string; status: string }>;
    },
  ) {
    try {
      const updates = data.updates.map((u) => ({
        employeeId: u.employeeId,
        date: new Date(u.date),
        status: u.status,
      }));

      const results = await this.attendanceService.bulkUpdateAttendance(
        data.organizationId,
        updates,
      );

      return {
        status: 'success',
        message: `Updated ${results.length} attendance records`,
        data: results,
      };
    } catch (error) {
      this.logger.error(`Error bulk updating attendance: ${(error as Error).message}`);
      throw new HttpException(
        'Failed to bulk update attendance',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ==================== LEAVE MANAGEMENT ====================

  @Post('leaves')
  async applyLeave(
    @Body()
    data: {
      organizationId: number;
      employeeId: number;
      leaveType: string;
      startDate: string;
      endDate: string;
    },
  ) {
    try {
      const leave = await this.leaveService.applyForLeave(
        data.organizationId,
        data.employeeId,
        data.leaveType,
        new Date(data.startDate),
        new Date(data.endDate),
      );

      return {
        status: 'success',
        message: 'Leave application submitted',
        data: leave,
      };
    } catch (error) {
      this.logger.error(`Error applying for leave: ${(error as Error).message}`);
      throw new HttpException(
        'Failed to submit leave application',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('leaves/pending/:organizationId')
  async getPendingLeaves(@Param('organizationId') organizationId: string) {
    try {
      const leaves = await this.leaveService.getPendingLeaves(parseInt(organizationId));

      return {
        status: 'success',
        data: leaves,
        count: leaves.length,
      };
    } catch (error) {
      this.logger.error(`Error fetching pending leaves: ${(error as Error).message}`);
      throw new HttpException(
        'Failed to fetch pending leaves',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('leaves/:organizationId/:employeeId')
  async getLeaveHistory(
    @Param('organizationId') organizationId: string,
    @Param('employeeId') employeeId: string,
  ) {
    try {
      const leaves = await this.leaveService.getLeaveHistory(
        parseInt(organizationId),
        parseInt(employeeId),
      );

      return {
        status: 'success',
        data: leaves,
        count: leaves.length,
      };
    } catch (error) {
      this.logger.error(`Error fetching leave history: ${(error as Error).message}`);
      throw new HttpException(
        'Failed to fetch leave history',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('leaves/:organizationId/:employeeId/balance')
  async getLeaveBalance(
    @Param('organizationId') organizationId: string,
    @Param('employeeId') employeeId: string,
  ) {
    try {
      const balance = await this.leaveService.getLeaveBalance(
        parseInt(organizationId),
        parseInt(employeeId),
      );

      return {
        status: 'success',
        data: balance,
      };
    } catch (error) {
      this.logger.error(`Error fetching leave balance: ${(error as Error).message}`);
      throw new HttpException(
        'Failed to fetch leave balance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('leaves/:leaveId/approve')
  async approveLeave(
    @Param('leaveId') leaveId: string,
    @Body() data: { approvedBy: number },
    @OrgContext() orgContext?: any,
  ) {
    try {
      const leave = await this.leaveService.approveLeave(
        orgContext.organizationId,
        parseInt(leaveId),
        data.approvedBy,
      );

      return {
        status: 'success',
        message: 'Leave approved',
        data: leave,
      };
    } catch (error) {
      this.logger.error(`Error approving leave: ${(error as Error).message}`);
      throw new HttpException(
        'Failed to approve leave',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('leaves/:leaveId/reject')
  async rejectLeave(
    @Param('leaveId') leaveId: string,
    @Body() data?: { reason?: string },
    @OrgContext() orgContext?: any,
  ) {
    try {
      const leave = await this.leaveService.rejectLeave(
        orgContext.organizationId,
        parseInt(leaveId),
      );

      return {
        status: 'success',
        message: 'Leave rejected',
        data: leave,
      };
    } catch (error) {
      this.logger.error(`Error rejecting leave: ${(error as Error).message}`);
      throw new HttpException(
        'Failed to reject leave',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ==================== BONUS MANAGEMENT ====================

  @Post('bonus/calculate')
  async calculateBonus(
    @Body()
    data: {
      organizationId: number;
      employeeId: number;
      month: number;
      year: number;
      baseBonus?: number;
    },
  ) {
    try {
      const bonus = await this.bonusService.calculateMonthlyBonus(
        data.organizationId,
        data.employeeId,
        data.month,
        data.year,
        data.baseBonus,
      );

      return {
        status: 'success',
        message: 'Bonus calculated',
        data: bonus,
      };
    } catch (error) {
      this.logger.error(`Error calculating bonus: ${(error as Error).message}`);
      throw new HttpException(
        'Failed to calculate bonus',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('bonus/calculate-all')
  async calculateAllBonuses(
    @Body()
    data: {
      organizationId: number;
      month: number;
      year: number;
      baseBonus?: number;
    },
  ) {
    try {
      const bonuses = await this.bonusService.calculateAllMonthlyBonuses(
        data.organizationId,
        data.month,
        data.year,
        data.baseBonus,
      );

      return {
        status: 'success',
        message: `Calculated bonuses for ${bonuses.length} employees`,
        data: bonuses,
        count: bonuses.length,
      };
    } catch (error) {
      this.logger.error(`Error calculating all bonuses: ${(error as Error).message}`);
      throw new HttpException(
        'Failed to calculate bonuses',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('bonus/:organizationId/:employeeId/history')
  async getBonusHistory(
    @Param('organizationId') organizationId: string,
    @Param('employeeId') employeeId: string,
  ) {
    try {
      const history = await this.bonusService.getBonusHistory(
        parseInt(organizationId),
        parseInt(employeeId),
      );

      return {
        status: 'success',
        data: history,
        count: history.length,
      };
    } catch (error) {
      this.logger.error(`Error fetching bonus history: ${(error as Error).message}`);
      throw new HttpException(
        'Failed to fetch bonus history',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('bonus/:organizationId/summary')
  async getBonusSummary(
    @Param('organizationId') organizationId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    try {
      const summary = await this.bonusService.getOrganizationBonusStats(
        parseInt(organizationId),
        parseInt(month),
        parseInt(year),
      );

      return {
        status: 'success',
        data: summary,
      };
    } catch (error) {
      this.logger.error(`Error fetching bonus summary: ${(error as Error).message}`);
      throw new HttpException(
        'Failed to fetch bonus summary',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
