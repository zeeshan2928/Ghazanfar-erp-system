import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import {
  CreateCommissionRuleDto,
  CalculateCommissionDto,
  ApproveCommissionDto,
} from '../dto/sales-commission.dto';

@Injectable()
export class SalesCommissionService {
  constructor(private prisma: PrismaService) {}

  async createCommissionRule(organizationId: number, createDto: CreateCommissionRuleDto) {
    const existing = await this.prisma.commissionRule.findFirst({
      where: {
        organizationId,
        name: createDto.name,
      },
    });

    if (existing) {
      throw new BadRequestException(`Commission rule "${createDto.name}" already exists`);
    }

    return this.prisma.commissionRule.create({
      data: {
        organizationId,
        name: createDto.name,
        description: createDto.description,
        ruleType: createDto.ruleType,
        percentage: createDto.percentage ? createDto.percentage.toString() : null,
        fixedAmount: createDto.fixedAmount,
        minSales: createDto.minSales,
        maxSales: createDto.maxSales,
      },
    });
  }

  async getCommissionRules(organizationId: number, skip = 0, take = 10) {
    const [data, total] = await Promise.all([
      this.prisma.commissionRule.findMany({
        where: { organizationId, isActive: true },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.commissionRule.count({
        where: { organizationId, isActive: true },
      }),
    ]);

    return {
      data,
      total,
      page: Math.floor(skip / take) + 1,
      hasMore: skip + take < total,
    };
  }

  async getCommissionRuleById(organizationId: number, ruleId: number) {
    const rule = await this.prisma.commissionRule.findFirst({
      where: { id: ruleId, organizationId },
    });

    if (!rule) {
      throw new NotFoundException('Commission rule not found');
    }

    return rule;
  }

  async updateCommissionRule(
    organizationId: number,
    ruleId: number,
    updateDto: Partial<CreateCommissionRuleDto>,
  ) {
    const rule = await this.getCommissionRuleById(organizationId, ruleId);

    return this.prisma.commissionRule.update({
      where: { id: ruleId },
      data: {
        ...updateDto,
        percentage: updateDto.percentage ? updateDto.percentage.toString() : undefined,
      },
    });
  }

  async calculateCommission(
    organizationId: number,
    salesPersonId: number,
    calculateDto: CalculateCommissionDto,
  ) {
    const rule = await this.getCommissionRuleById(organizationId, calculateDto.ruleId);

    if (!rule.isActive) {
      throw new BadRequestException('Commission rule is not active');
    }

    let commissionAmount = 0;

    if (rule.ruleType === 'PERCENTAGE' && rule.percentage) {
      const percentage =
        typeof rule.percentage === 'string' ? parseFloat(rule.percentage) : Number(rule.percentage);
      commissionAmount = Math.floor((calculateDto.baseSales * percentage) / 100);
    } else if (rule.ruleType === 'FIXED') {
      commissionAmount = rule.fixedAmount || 0;
    } else if (rule.ruleType === 'TIERED') {
      if (rule.minSales && calculateDto.baseSales >= rule.minSales) {
        const percentage = rule.percentage
          ? typeof rule.percentage === 'string'
            ? parseFloat(rule.percentage)
            : Number(rule.percentage)
          : 0;
        commissionAmount = Math.floor((calculateDto.baseSales * percentage) / 100);
      }
    }

    return this.prisma.commissionCalculation.create({
      data: {
        organizationId,
        ruleId: calculateDto.ruleId,
        salesPersonId,
        period: calculateDto.period,
        startDate: calculateDto.startDate,
        endDate: calculateDto.endDate,
        baseSales: calculateDto.baseSales,
        commissionAmount,
        status: 'DRAFT',
      },
      include: {
        rule: true,
        salesperson: true,
      },
    });
  }

  async approveCommission(
    organizationId: number,
    commissionId: number,
    approverId: number,
    approveDto: ApproveCommissionDto,
  ) {
    const commission = await this.prisma.commissionCalculation.findFirst({
      where: { id: commissionId, organizationId },
    });

    if (!commission) {
      throw new NotFoundException('Commission calculation not found');
    }

    if (commission.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot approve commission with status ${commission.status}`);
    }

    return this.prisma.commissionCalculation.update({
      where: { id: commissionId },
      data: {
        status: 'APPROVED',
        approvedBy: approverId,
        approvalDate: new Date(),
        notes: approveDto.notes,
      },
      include: {
        rule: true,
        salesperson: true,
      },
    });
  }

  async getCommissionHistory(organizationId: number, salesPersonId: number, skip = 0, take = 10) {
    const [data, total] = await Promise.all([
      this.prisma.commissionCalculation.findMany({
        where: { organizationId, salesPersonId },
        include: {
          rule: true,
          salesperson: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: { startDate: 'desc' },
        skip,
        take,
      }),
      this.prisma.commissionCalculation.count({
        where: { organizationId, salesPersonId },
      }),
    ]);

    return {
      data,
      total,
      page: Math.floor(skip / take) + 1,
      hasMore: skip + take < total,
    };
  }

  async getPeriodCommissionSummary(organizationId: number, startDate: Date, endDate: Date) {
    const commissions = await this.prisma.commissionCalculation.findMany({
      where: {
        organizationId,
        startDate: { gte: startDate },
        endDate: { lte: endDate },
      },
      include: {
        rule: true,
        salesperson: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { baseSales: 'desc' },
    });

    const totalCommission = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
    const totalSales = commissions.reduce((sum, c) => sum + c.baseSales, 0);

    const bySalesperson = new Map<number, any>();
    for (const commission of commissions) {
      const key = commission.salesPersonId;
      const current = bySalesperson.get(key) || {
        salesPersonId: commission.salesPersonId,
        name: `${commission.salesperson.firstName} ${commission.salesperson.lastName}`,
        totalSales: 0,
        totalCommission: 0,
        commissionCount: 0,
      };
      current.totalSales += commission.baseSales;
      current.totalCommission += commission.commissionAmount;
      current.commissionCount++;
      bySalesperson.set(key, current);
    }

    return {
      period: { startDate, endDate },
      totalSales,
      totalCommission,
      averageCommissionPerSalesperson:
        bySalesperson.size > 0 ? totalCommission / bySalesperson.size : 0,
      bySalesperson: Array.from(bySalesperson.values()).sort(
        (a, b) => b.totalCommission - a.totalCommission,
      ),
      details: commissions,
    };
  }

  async setProductCommission(
    organizationId: number,
    productId: number,
    commissionRate: number,
    effectiveFrom: Date,
    effectiveTo?: Date,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, organizationId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.productCommission.create({
      data: {
        organizationId,
        productId,
        commissionRate: commissionRate.toString(),
        effectiveFrom,
        effectiveTo,
      },
    });
  }

  async getProductCommissions(organizationId: number, productId: number) {
    return this.prisma.productCommission.findMany({
      where: { organizationId, productId },
      orderBy: { effectiveFrom: 'desc' },
    });
  }
}
