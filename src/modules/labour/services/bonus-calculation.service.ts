import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';

/**
 * NOTE: this entire service is built against Prisma models that don't exist
 * anywhere in schema.prisma (Attendance, AttendanceBonus, Employee) - same
 * pattern as leave.service.ts (see its docstring for full context). Stubbed
 * to log a warning and return safe defaults rather than crash.
 */
@Injectable()
export class BonusCalculationService {
  private readonly logger = new Logger(BonusCalculationService.name);

  constructor(private prisma: PrismaService) {}

  async calculateMonthlyBonus(
    organizationId: number,
    employeeId: number,
    month: number,
    year: number,
    baseBonus: number = 0,
  ): Promise<any> {
    this.logger.warn(
      'calculateMonthlyBonus(): no Attendance/AttendanceBonus model exists in schema.prisma',
    );
    return null;
  }

  async getMonthlyBonus(
    organizationId: number,
    employeeId: number,
    bonusMonth: Date,
  ): Promise<any> {
    this.logger.warn('getMonthlyBonus(): no AttendanceBonus model exists in schema.prisma');
    return null;
  }

  async getBonusHistory(organizationId: number, employeeId: number): Promise<any[]> {
    this.logger.warn('getBonusHistory(): no AttendanceBonus model exists in schema.prisma');
    return [];
  }

  async getOrganizationBonusStats(organizationId: number, month: number, year: number) {
    this.logger.warn(
      'getOrganizationBonusStats(): no AttendanceBonus model exists in schema.prisma',
    );
    return {
      month,
      year,
      totalBonuses: 0,
      total_amount: new Prisma.Decimal(0),
      averageBonus: new Prisma.Decimal(0),
      details: [],
    };
  }

  async calculateAllMonthlyBonuses(
    organizationId: number,
    month: number,
    year: number,
    baseBonus: number = 0,
  ): Promise<any[]> {
    this.logger.warn(
      'calculateAllMonthlyBonuses(): no Employee/Attendance/AttendanceBonus model exists in schema.prisma',
    );
    return [];
  }
}
