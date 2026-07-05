import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { Prisma } from '@prisma/client';

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
  ) {
    try {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 1);

      const attendance = await this.prisma.attendance.findMany({
        where: {
          organizationId,
          employeeId,
          attendanceDate: { gte: startDate, lt: endDate },
        },
      });

      const presentDays = attendance.filter(a => a.status === 'PRESENT').length;
      const leaveDays = attendance.filter(a => a.status === 'LEAVE').length;
      const absentDays = attendance.filter(a => a.status === 'ABSENT').length;

      let bonusAmount = new Prisma.Decimal(baseBonus);

      if (leaveDays === 0) {
        bonusAmount = bonusAmount.add(500);
      }

      bonusAmount = bonusAmount.add(presentDays * 100);

      return await this.prisma.attendanceBonus.create({
        data: {
          organizationId,
          employeeId,
          bonusMonth: startDate,
          bonusAmount,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to calculate bonus: ${(error as Error).message}`);
      throw error;
    }
  }

  async getMonthlyBonus(organizationId: number, employeeId: number, bonusMonth: Date) {
    return this.prisma.attendanceBonus.findFirst({
      where: {
        organizationId,
        employeeId,
        bonusMonth,
      },
    });
  }

  async getBonusHistory(organizationId: number, employeeId: number) {
    return this.prisma.attendanceBonus.findMany({
      where: { organizationId, employeeId },
      orderBy: { bonusMonth: 'desc' },
    });
  }

  async getOrganizationBonusStats(organizationId: number, month: number, year: number) {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 1);

    const bonuses = await this.prisma.attendanceBonus.findMany({
      where: {
        organizationId,
        bonusMonth: { gte: startDate, lt: endDate },
      },
      include: { employee: true },
    });

    const totalBonus = bonuses.reduce((sum, b) => sum.add(b.bonusAmount), new Prisma.Decimal(0));

    return {
      month,
      year,
      totalBonuses: bonuses.length,
      totalAmount: totalBonus,
      averageBonus: bonuses.length > 0 ? totalBonus.div(bonuses.length) : new Prisma.Decimal(0),
      details: bonuses,
    };
  }

  async calculateAllMonthlyBonuses(organizationId: number, month: number, year: number, baseBonus: number = 0) {
    try {
      const employees = await this.prisma.employee.findMany({
        where: { organizationId, isActive: true },
      });

      const results = [];
      for (const employee of employees) {
        const bonus = await this.calculateMonthlyBonus(organizationId, employee.id, month, year, baseBonus);
        results.push(bonus);
      }

      return results;
    } catch (error) {
      this.logger.error(`Failed to calculate all bonuses: ${(error as Error).message}`);
      throw error;
    }
  }
}
