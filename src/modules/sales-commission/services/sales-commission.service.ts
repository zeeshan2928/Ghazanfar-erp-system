import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SalesCommissionService {
  private readonly logger = new Logger(SalesCommissionService.name);

  constructor(private prisma: PrismaService) {}

  async createCommissionRule(
    organizationId: number,
    name: string,
    commissionPercentage: number,
    minimumTarget: number = 0,
  ) {
    return this.prisma.commissionRule.create({
      data: {
        organizationId,
        name,
        commissionPercentage: new Prisma.Decimal(commissionPercentage),
        minimumTarget: new Prisma.Decimal(minimumTarget),
      },
    });
  }

  async getCommissionRules(organizationId: number) {
    return this.prisma.commissionRule.findMany({
      where: { organizationId },
    });
  }

  async calculateCommission(
    organizationId: number,
    ruleId: number,
    salesAmount: number,
    employeeId: number,
  ) {
    const rule = await this.prisma.commissionRule.findFirst({
      where: { organizationId, id: ruleId },
    });

    if (!rule || salesAmount < rule.minimumTarget.toNumber()) {
      return null;
    }

    const commissionAmount = new Prisma.Decimal(salesAmount).mul(rule.commissionPercentage).div(100);

    return await this.prisma.commissionCalculation.create({
      data: {
        organizationId,
        employeeId,
        salesAmount: new Prisma.Decimal(salesAmount),
        commissionAmount,
        calculationMonth: new Date(),
      },
    });
  }

  async approveCommission(organizationId: number, commissionId: number) {
    return this.prisma.commissionCalculation.findUnique({
      where: { id: commissionId },
    });
  }

  async getCommissionHistory(organizationId: number, employeeId: number) {
    return this.prisma.commissionCalculation.findMany({
      where: { organizationId, employeeId },
      orderBy: { calculationMonth: 'desc' },
    });
  }

  async getMonthlyCommissionSummary(organizationId: number, month: number, year: number) {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 1);

    const commissions = await this.prisma.commissionCalculation.findMany({
      where: {
        organizationId,
        calculationMonth: { gte: startDate, lt: endDate },
      },
    });

    const totalCommission = commissions.reduce((sum, c) => sum.add(c.commissionAmount), new Prisma.Decimal(0));

    return {
      month,
      year,
      totalCommissions: commissions.length,
      totalAmount: totalCommission,
      averageCommission: commissions.length > 0 ? totalCommission.div(commissions.length) : new Prisma.Decimal(0),
      details: commissions,
    };
  }

  async getProductCommissionStats(organizationId: number, productId: number) {
    return this.prisma.productCommission.findMany({
      where: { organizationId, productId },
    });
  }
}
